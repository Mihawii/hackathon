import { offlineReadings } from './assets/narration/fallback.mjs';
import studioReadings from './assets/narration/studio.mjs';

export const narrationProvider = studioReadings ? 'ElevenLabs' : 'CMU Flite';

function findLocalVoice(service) {
    const english = service.getVoices().filter(voice => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang));
    const preferences = [
        /\b(grandpa|grandfather)\b/i,
        /\b(daniel|george|arthur|gordon|oliver|graham)\b/i,
        /\b(david|alex|james|brian|aaron|andrew|tom|fred|reed|male)\b/i
    ];
    for (const name of preferences) {
        const voice = english.find(candidate => name.test(candidate.name));
        if (voice) return voice;
    }
    return english.find(voice => voice.gender === 'male');
}

const noop = () => {};

export function createNarrator({ onCaption = noop, onStatus = noop, onSpeaking = noop } = {}) {
    let key = null;
    let reading = null;
    let source = '';
    let enabled = false;
    let disposed = false;
    let generation = 0;
    let audio = null;
    let speech = null;
    let timer = null;
    let caption, status, statusSource, speaking;

    function showCaption(text) {
        if (caption === text) return;
        caption = text;
        onCaption(text);
    }

    function setStatus(next) {
        if (status === next && statusSource === source) return;
        status = next;
        statusSource = source;
        onStatus(next, source);
    }

    function setSpeaking(next) {
        if (speaking === next) return;
        speaking = next;
        onSpeaking(next);
    }

    function later(callback, milliseconds) {
        clearTimeout(timer);
        const current = generation;
        timer = setTimeout(() => {
            if (current === generation) callback();
        }, milliseconds);
    }

    function releaseAudio() {
        if (!audio) return;
        const old = audio;
        audio = null;
        old.onplaying = old.onwaiting = old.ontimeupdate = old.onended = old.onerror = null;
        old.pause();
        old.removeAttribute('src');
        old.load();
    }

    function releaseSpeech() {
        if (!speech) return;
        const { service, line } = speech;
        speech = null;
        line.onstart = line.onend = line.onerror = null;
        try { service.cancel(); }
        catch { /* A device can revoke speech access during playback. */ }
    }

    function clearPlayback() {
        generation++;
        clearTimeout(timer);
        releaseAudio();
        releaseSpeech();
        showCaption('');
        setSpeaking(false);
    }

    function finish() {
        clearPlayback();
        setStatus('ended');
    }

    function afterLine(index, next) {
        showCaption('');
        const following = reading.cues[index + 1];
        if (!following) return finish();
        later(next, (following.start - reading.cues[index].end) * 1000);
    }

    function showTimedLine(index) {
        const cue = reading.cues[index];
        showCaption(cue.text);
        later(() => afterLine(index, () => showTimedLine(index + 1)), (cue.end - cue.start) * 1000);
    }

    function useCaptions(index) {
        clearTimeout(timer);
        releaseSpeech();
        source = '';
        setSpeaking(false);
        setStatus('captions');
        showTimedLine(index);
    }

    function speakLine(index, service, voice) {
        const cue = reading.cues[index];
        try {
            const line = new SpeechSynthesisUtterance(cue.text);
            line.voice = voice;
            line.lang = voice.lang;
            line.rate = 0.84;
            line.pitch = 0.91;
            speech = { service, line };
            const isCurrent = () => speech?.line === line;
            const failed = () => { if (isCurrent()) useCaptions(index); };
            line.onstart = () => {
                if (!isCurrent()) return;
                setStatus('playing');
                setSpeaking(true);
                showCaption(cue.text);
                later(failed, Math.max(10000, (cue.end - cue.start) * 2500));
            };
            line.onend = () => {
                if (!isCurrent()) return;
                clearTimeout(timer);
                speech = null;
                afterLine(index, () => speakLine(index + 1, service, voice));
            };
            line.onerror = failed;
            later(failed, 3000);
            service.speak(line);
        }
        catch {
            useCaptions(index);
        }
    }

    function useFallback() {
        if (reading !== offlineReadings[key]) return play(true);
        clearTimeout(timer);
        const position = audio?.currentTime || 0;
        const index = reading.cues.findIndex(cue => cue.end > position);
        releaseAudio();
        setSpeaking(false);
        if (index < 0) return finish();
        try {
            const service = globalThis.speechSynthesis;
            if (service && typeof SpeechSynthesisUtterance === 'function') {
                const voice = findLocalVoice(service);
                if (voice) {
                    source = 'Device voice';
                    setStatus('loading');
                    return speakLine(index, service, voice);
                }
            }
        }
        catch { /* A browser may disable its local speech service. */ }
        useCaptions(index);
    }

    function play(useOffline = false) {
        clearPlayback();
        if (!key) return setStatus('idle');
        reading = useOffline ? offlineReadings[key] : (studioReadings?.[key] || offlineReadings[key]);
        source = reading === offlineReadings[key] ? 'CMU Flite' : 'ElevenLabs';
        if (!enabled) return setStatus('off');
        setStatus('loading');
        try {
            const player = new Audio(reading.audio);
            audio = player;
            player.preload = 'auto';
            player.playsInline = true;
            const failed = () => { if (audio === player) useFallback(); };
            const syncCaption = () => {
                if (audio !== player) return;
                const time = player.currentTime;
                const cue = reading.cues.find(item => item.start <= time && time < item.end);
                showCaption(cue?.text || '');
            };
            const playing = () => {
                if (audio !== player) return;
                clearTimeout(timer);
                setStatus('playing');
                setSpeaking(true);
                syncCaption();
            };
            player.onplaying = playing;
            player.ontimeupdate = syncCaption;
            player.onended = () => { if (audio === player) finish(); };
            player.onerror = failed;
            player.onwaiting = () => {
                if (audio !== player) return;
                setSpeaking(false);
                setStatus('loading');
                later(failed, 6000);
            };
            later(failed, 6000);
            // Keep the first play() in the photo click's activation window.
            player.play()?.then(playing, failed);
        }
        catch {
            useFallback();
        }
    }

    function stop() {
        if (disposed) return;
        key = null;
        reading = null;
        source = '';
        clearPlayback();
        setStatus('idle');
    }

    return {
        start(mood, withVoice = true) {
            if (disposed) return;
            key = Object.hasOwn(offlineReadings, mood) ? mood : 'memory';
            enabled = Boolean(withVoice);
            play();
        },
        setEnabled(value) {
            if (disposed || enabled === Boolean(value)) return;
            enabled = Boolean(value);
            if (key) play();
        },
        replay() {
            if (!disposed && enabled && key) play();
        },
        stop,
        dispose() {
            stop();
            disposed = true;
        }
    };
}
