import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { offlineReadings } from '../keepsake/assets/narration/fallback.mjs';

const sampleRate = 24000;
const directory = fileURLToPath(new URL('../keepsake/assets/narration/', import.meta.url));
const letters = text => text.toLowerCase().replace(/[^a-z0-9]/g, '');

function sentenceCues(lines, alignment, duration) {
    const characters = alignment?.characters;
    const starts = alignment?.character_start_times_seconds;
    const ends = alignment?.character_end_times_seconds;
    if (!Array.isArray(characters) || !Array.isArray(starts) || !Array.isArray(ends) ||
        characters.length !== starts.length || starts.length !== ends.length) return null;

    // The service can normalize curly punctuation and paragraph separators.
    // Keep each original letter's timing index while matching the spoken words.
    let transcript = '';
    const positions = [];
    for (let i = 0; i < characters.length; i++) {
        if (typeof characters[i] !== 'string' || !Number.isFinite(starts[i]) || !Number.isFinite(ends[i]) ||
            starts[i] < 0 || ends[i] < starts[i] || ends[i] > duration + 0.12) return null;
        for (const letter of letters(characters[i])) {
            transcript += letter;
            positions.push(i);
        }
    }
    if (transcript !== letters(lines.join(''))) return null;

    const cues = [];
    let index = 0;
    for (const text of lines) {
        const start = starts[positions[index]];
        index += letters(text).length;
        const end = Math.min(duration, ends[positions[index - 1]]);
        if (end <= start || (cues.length && start < cues.at(-1).end)) return null;
        cues.push({ start, end, text });
    }
    return cues;
}

function hasVoice(pcm, cue) {
    const first = Math.round(cue.start * sampleRate);
    const last = Math.min(pcm.length / 2, Math.ceil(cue.end * sampleRate));
    let sum = 0;
    for (let i = first; i < last; i++) sum += pcm.readInt16LE(i * 2) ** 2;
    return last > first && Math.sqrt(sum / (last - first)) > 40;
}

function paceReading(pcm, cues) {
    const lead = Math.round(0.3 * sampleRate);
    const chunks = [Buffer.alloc(lead * 2)];
    const timed = [];
    let shiftedFrames = lead;
    let copiedBytes = 0;
    for (const [i, cue] of cues.entries()) {
        if (i > 0) {
            const previousEnd = cues[i - 1].end;
            const extra = Math.round((0.95 - (cue.start - previousEnd)) * sampleRate);
            if (extra > 0) {
                const cut = Math.round((cue.start + previousEnd) * 0.5 * sampleRate);
                const fade = Math.min(48, cut, pcm.length / 2 - cut);
                for (let n = 0; n < fade; n++) {
                    const before = (cut - n - 1) * 2;
                    const after = (cut + n) * 2;
                    pcm.writeInt16LE(Math.round(pcm.readInt16LE(before) * n / fade), before);
                    pcm.writeInt16LE(Math.round(pcm.readInt16LE(after) * n / fade), after);
                }
                chunks.push(pcm.subarray(copiedBytes, cut * 2), Buffer.alloc(extra * 2));
                copiedBytes = cut * 2;
                shiftedFrames += extra;
            }
        }
        const shift = shiftedFrames / sampleRate;
        timed.push({ start: +(cue.start + shift).toFixed(3), end: +(cue.end + shift).toFixed(3), text: cue.text });
    }
    chunks.push(pcm.subarray(copiedBytes), Buffer.alloc(Math.round(0.65 * sampleRate) * 2));
    return { pcm: Buffer.concat(chunks), cues: timed };
}

function waveFile(pcm) {
    const header = Buffer.alloc(44);
    header.write('RIFF');
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVEfmt ', 8);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]);
}

async function renderReading(key, lines, voiceId, apiKey) {
    const endpoint = new URL('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId) + '/with-timestamps');
    endpoint.searchParams.set('output_format', 'pcm_24000');
    const response = await fetch(endpoint, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(120000),
        headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
        body: JSON.stringify({
            text: lines.join('\n\n'),
            model_id: 'eleven_multilingual_v2',
            language_code: 'en',
            voice_settings: { stability: 0.64, similarity_boost: 0.78, style: 0.14, use_speaker_boost: true, speed: 0.87 }
        })
    });
    if (!response.ok) throw new Error(`ElevenLabs returned HTTP ${response.status} for ${key}. Check the voice ID, API key permissions and credit balance.`);
    const result = await response.json();
    if (typeof result.audio_base64 !== 'string') throw new Error(`Missing audio for ${key}.`);
    const audio = Buffer.from(result.audio_base64, 'base64');
    if (!audio.length || audio.length % 2) throw new Error(`Incomplete PCM audio for ${key}.`);
    const duration = audio.length / (2 * sampleRate);
    const cues = sentenceCues(lines, result.alignment, duration) || sentenceCues(lines, result.normalized_alignment, duration);
    if (!cues) throw new Error(`The returned timestamps do not match the script for ${key}.`);
    if (cues.some(cue => !hasVoice(audio, cue))) throw new Error(`The recording for ${key} contains a silent sentence.`);
    return paceReading(audio, cues);
}

async function generate() {
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || process.env.XI_API_KEY?.trim();
    if (!apiKey) throw new Error('Set ELEVENLABS_API_KEY or XI_API_KEY in the environment before generating the four recordings.');
    const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || 'pqHfZKP75CvOlQylNhV4'; // Bill – older, warm narrator
    const take = await mkdtemp(join(directory, 'studio-take-'));
    try {
        const entries = [];
        for (const [key, reading] of Object.entries(offlineReadings)) {
            const lines = reading.cues.map(cue => cue.text);
            const { pcm, cues } = await renderReading(key, lines, voiceId, apiKey);
            await writeFile(join(take, key + '.wav'), waveFile(pcm));
            const audio = JSON.stringify('./' + basename(take) + '/' + key + '.wav');
            entries.push(`    ${key}: { audio: new URL(${audio}, import.meta.url).href, cues: ${JSON.stringify(cues)} }`);
        }
        const manifest = join(take, 'publish.mjs');
        await writeFile(manifest, 'export default {\n' + entries.join(',\n') + '\n};\n');
        // A running album or an interrupted generation can keep its previous complete take.
        await rename(manifest, join(directory, 'studio.mjs'));
    }
    catch (error) {
        await rm(take, { recursive: true, force: true });
        throw error;
    }
    console.log('Activated all four ElevenLabs recordings and their matching subtitles.');
}

generate().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
