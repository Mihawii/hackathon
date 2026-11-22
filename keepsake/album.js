import { gsap } from 'gsap';
import { createNarrator } from './narration.js';

const $ = id => document.getElementById(id);

// Three fictional sample days. Each mood keeps the same book and changes the
// paper theatre, the weather, the score and the narrator's passage.
const samples = [
    { id: 'lake', narration: 'gold', title: 'The last light on water', date: '2026-09-12', text: 'We stayed on the bank until the reeds turned gold. You folded our old tram ticket into a boat. For a little while it kept up with our footsteps.', photos: [new URL('./assets/lake.jpg', import.meta.url).href], caption: 'By the water', mood: 'gold', tint: '#bd9e65', pace: .84, song: 'Chill Sunset · Finley', audio: new URL('./assets/music/chill-sunset.mp3', import.meta.url).href },
    { id: 'rain', narration: 'rain', title: 'Rain at the window seat', date: '2026-10-03', text: 'Our bus went by in the rain. We ordered another pot of tea and watched the shop lights stretch into little rivers across the street.', photos: [new URL('./assets/rain.jpg', import.meta.url).href], caption: 'Through the café glass', mood: 'rain', tint: '#879ca8', pace: .69, song: 'Rain Music · Alex Morgan', audio: new URL('./assets/music/rain-music.mp3', import.meta.url).href },
    { id: 'meadow', narration: 'bloom', title: 'A pocketful of poppies', date: '2026-05-24', text: 'We took the long way back. The path disappeared in the poppies and we sang the same four bars all the way down the hill.', photos: [new URL('./assets/meadow.jpg', import.meta.url).href], caption: 'On the hillside', mood: 'bloom', tint: '#af8559', pace: 1.42, song: 'Relax · AndriiG', audio: new URL('./assets/music/relax.mp3', import.meta.url).href }
];
const BLANK = { id: 'blank', blank: true, title: 'A new page', date: '', text: '', photos: [], caption: '', mood: 'gold', tint: '#bd9e65' };
const days = [...samples];
const player = $('player');
const pad = n => String(n).padStart(2, '0');
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const formatDate = date => dateFormat.format(new Date(date + 'T12:00:00'));

let book = null, current = 0, isOpen = false, inScene = false, turning = false, saving = false;
let speaking = false, songUrl = null, hintTimer = 0;

const page = index => index < days.length ? days[index] : BLANK;
const neighbor = direction => {
    const index = current + direction;
    return index >= 0 && index <= days.length ? page(index) : null;
};

const HINTS = {
    closed: '✦  Tap the book to open it',
    open: 'Drag the page corner to turn it  ·  Tap the glowing photograph to bring it to life',
    scene: 'Tap anywhere to fold the scene back into the page',
    blank: 'Tap the empty page to write a new day'
};

// One clear instruction stays on screen and changes with each step.
function hint(text) {
    const el = $('hint');
    clearTimeout(hintTimer);
    if (el.textContent === text && el.classList.contains('shown')) return;
    el.classList.remove('shown');
    hintTimer = setTimeout(() => {
        el.textContent = text;
        el.classList.add('shown');
    }, 250);
}

const readingHint = () => hint(page(current).blank ? HINTS.blank : HINTS.open);

function announce(text) { $('announcement').textContent = text; }

// Music: each day's song plays under the spread and steps back for the voice.
function music() {
    const day = page(current);
    const target = isOpen && !day.blank ? (speaking ? .08 : inScene ? .22 : .42) : 0;
    gsap.to(player, { volume: target, duration: speaking ? .35 : 1.1, overwrite: true,
        onComplete() { if (!target) player.pause(); } });
    if (target && player.src && player.paused) player.play().catch(() => {});
}

function loadSong(day) {
    if (songUrl) { URL.revokeObjectURL(songUrl); songUrl = null; }
    player.pause();
    player.volume = 0;
    player.removeAttribute('src');
    if (day.audio instanceof Blob) player.src = songUrl = URL.createObjectURL(day.audio);
    else if (day.audio) player.src = day.audio;
    player.load();
}

const narrator = createNarrator({
    onCaption(text) {
        const el = $('caption');
        if (text) el.textContent = text;
        el.classList.toggle('shown', Boolean(text));
    },
    onSpeaking(value) { speaking = value; music(); }
});

function show() {
    book?.setState({ open: isOpen, day: page(current), photoIndex: 0 });
}

function openBook() {
    if (isOpen || !book) return;
    isOpen = true;
    show();
    loadSong(page(current));
    music();
    announce('The book opens on ' + page(current).title);
    setTimeout(readingHint, 1200);
}

function closeBook() {
    if (!isOpen || inScene) return;
    isOpen = false;
    show();
    music();
    hint(HINTS.closed);
}

function commit(direction) {
    current += direction;
    const day = page(current);
    loadSong(day);
    music();
    announce(day.blank ? 'A blank page. Touch it to write a new day.' : day.title + ', ' + formatDate(day.date));
    readingHint();
}

async function turn(direction) {
    if (!isOpen || inScene || turning || !neighbor(direction) || !book) return;
    turning = true;
    try {
        if (await book.turn(direction, neighbor(direction)) !== false) commit(direction);
    } finally {
        turning = false;
    }
}

function enter() {
    const day = page(current);
    if (!isOpen || inScene || day.blank || !book) return;
    const length = book.enterScene();
    if (!length) return;
    inScene = true;
    narrator.start(day.narration || 'memory', true);
    music();
    announce('The photograph unfolds into a paper theatre. ' + day.text);
    hint(HINTS.scene);
}

async function leave() {
    if (!inScene || !book) return;
    narrator.stop();
    $('caption').classList.remove('shown');
    await book.leaveScene();
    inScene = false;
    music();
    readingHint();
}

function write() {
    if (inScene) return;
    if (!$('date').value) {
        const now = new Date();
        $('date').value = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-');
    }
    $('new-dialog').showModal();
}

async function start() {
    try {
        const { createBookView } = await import('./book-model.js');
        book = await createBookView($('book-host'), {
            onOpen: openBook,
            onEnter: enter,
            onLeaveScene: leave,
            onBlank: write,
            onTurn: commit,
            neighbor: direction => (inScene ? null : neighbor(direction)),
            onUnavailable() { $('no-webgl').hidden = false; }
        });
    } catch (error) {
        console.warn(error);
    }
    if (!book) { $('no-webgl').hidden = false; return; }
    show();
    setTimeout(() => { if (!isOpen) hint(HINTS.closed); }, 3800);
}

// Storage: every bound day lives in this browser's IndexedDB.
function database() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('little-days-album', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('days', { keyPath: 'id' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function storedDays() {
    const db = await database();
    try {
        return await new Promise((resolve, reject) => {
            const request = db.transaction('days').objectStore('days').getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } finally { db.close(); }
}

async function bind(day) {
    const db = await database();
    try {
        await new Promise((resolve, reject) => {
            const tx = db.transaction('days', 'readwrite');
            tx.objectStore('days').put(day);
            tx.oncomplete = resolve;
            tx.onabort = () => reject(tx.error);
        });
    } finally { db.close(); }
}

async function processPhoto(file) {
    const url = URL.createObjectURL(file), img = new Image();
    try {
        img.src = url;
        await img.decode();
        const canvas = document.createElement('canvas'), scale = Math.min(1, 1400 / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', .86);
        canvas.width = canvas.height = 12;
        ctx.drawImage(img, 0, 0, 12, 12);
        const pixels = ctx.getImageData(0, 0, 12, 12).data, rgb = [0, 0, 0];
        for (let i = 0; i < pixels.length; i += 4) for (let c = 0; c < 3; c++) rgb[c] += pixels[i + c] / 144;
        return { data, rgb: rgb.map(Math.round) };
    } finally { URL.revokeObjectURL(url); }
}

// Energy from the first minute of the song: level plus the rate of sharp rises.
async function measureMusic(file) {
    const Engine = window.AudioContext || window.webkitAudioContext;
    const ctx = new Engine();
    try {
        const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
        const signal = buffer.getChannelData(0), stride = Math.max(1, Math.floor(buffer.sampleRate / 50));
        const blocks = Math.min(Math.floor(signal.length / stride), 3000);
        let envelope = 0, total = 0, rises = 0, lastRise = -10;
        for (let n = 0; n < blocks; n++) {
            let amplitude = 0;
            for (let i = 0; i < stride; i += 8) amplitude += Math.abs(signal[n * stride + i]);
            amplitude /= Math.ceil(stride / 8);
            total += amplitude;
            if (amplitude > envelope * 1.33 + .008 && n - lastRise > 6) { rises++; lastRise = n; }
            envelope = envelope * .82 + amplitude * .18;
        }
        const seconds = Math.max(.02, blocks / 50);
        return Math.min(1.85, Math.max(.58, .58 + (rises / seconds) * .23 + total / Math.max(1, blocks) * 1.45));
    } finally { await ctx.close(); }
}

function nameDay(text, mood) {
    const concrete = [
        [/какао/i, 'Какао в конце дня'], [/дожд/i, 'Пока шёл дождь'], [/озер|озёр/i, 'День у озера'],
        [/cocoa/i, 'A day over cocoa'], [/train/i, 'On the train ride'], [/lake/i, 'A day by the lake'], [/poppies/i, 'Among the red poppies'],
        [/café|cafe|coffee/i, 'A moment over coffee'], [/rain/i, 'While the rain fell'], [/garden/i, 'An afternoon in the garden']
    ];
    const title = concrete.find(([pattern]) => pattern.test(text))?.[1];
    if (title) return title;
    const words = text.match(/[\p{L}\p{M}\p{N}]+(?:[’'-][\p{L}\p{M}\p{N}]+)*/gu) || [];
    if (words.length >= 3) {
        const phrase = words.slice(0, 6).join(' ');
        return phrase.charAt(0).toLocaleUpperCase() + phrase.slice(1);
    }
    return [/[а-яё]/i.test(text) ? 'День в памяти' : mood === 'rain' ? 'A quiet day' : 'A day to keep', ...words].join(' ');
}

// Words lead; the photograph's colour and the song's energy decide the rest.
function moodFor(text, rgb, pace) {
    if (/rain|quiet night|missed|tired|storm|sad|дожд|груст|устал|гроз|ночь/i.test(text)) return 'rain';
    if (/flower|meadow|spring|garden|danc|party|joy|poppies|sing|цве[тл]|весн|танц|празд|пел/i.test(text)) return 'bloom';
    if (/lake|sunset|warm|cocoa|autumn|river|sea|озер|озёр|закат|какао|осен|море/i.test(text)) return 'gold';
    if (rgb[2] > rgb[0] * 1.12) return 'rain';
    return pace > 1.2 || rgb[1] > rgb[0] * 1.12 ? 'bloom' : 'gold';
}

function updateSource() {
    const link = $('entry-form').elements.source.value === 'link';
    $('audio-field').hidden = link;
    $('link-fields').hidden = !link;
    $('audio-file').required = !link;
    $('song-url').required = link;
}

async function save(event) {
    event.preventDefault();
    if (saving) return;
    const status = $('form-status'), form = $('entry-form'), text = $('story').value.trim(), files = Array.from($('photos').files);
    const link = form.elements.source.value === 'link';
    if (!text) { status.textContent = 'Write a few words about the day.'; return; }
    let url = null;
    if (link) {
        try {
            url = new URL($('song-url').value);
            if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
        } catch {
            status.textContent = 'Enter a music link beginning with https:// or http://.';
            return;
        }
    }
    saving = true;
    $('save').disabled = true;
    let failure = 'One of the photographs could not be opened. Try a JPEG, PNG or WebP image.';
    try {
        status.textContent = 'Mounting your photographs…';
        const pictures = [];
        for (const file of files) pictures.push(await processPhoto(file));
        const rgb = pictures[0].rgb, audio = link ? null : $('audio-file').files[0];
        failure = 'This audio file could not be read. Try MP3 or WAV, or use a song link.';
        status.textContent = 'Listening for the rhythm…';
        const pace = link ? { slow: .68, steady: 1, bright: 1.57 }[$('song-energy').value] : await measureMusic(audio);
        const mood = moodFor(text, rgb, pace);
        const date = $('date').value;
        const day = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random(), created: Date.now(),
            title: nameDay(text, mood), date, text, photos: pictures.map(p => p.data), caption: formatDate(date),
            mood, narration: 'memory', tint: 'rgb(' + rgb.join(',') + ')', pace,
            song: link ? url.hostname.replace(/^www\./, '') : audio.name.replace(/\.[^.]+$/, ''), songUrl: link ? url.href : null, audio
        };
        failure = 'This browser could not save the day. Free some browser storage and try again.';
        status.textContent = 'Binding the page…';
        await bind(day);
        days.push(day);
        form.reset();
        updateSource();
        status.textContent = '';
        $('new-dialog').close();
        // The blank leaf becomes the new day; a fresh blank waits behind it.
        current = days.length - 1;
        show();
        loadSong(day);
        music();
        announce('Bound: ' + day.title);
        readingHint();
    } catch {
        status.textContent = failure;
    } finally {
        saving = false;
        $('save').disabled = false;
    }
}

$('entry-form').onsubmit = save;
document.querySelectorAll('input[name=source]').forEach(input => { input.onchange = updateSource; });
document.querySelectorAll('[data-close]').forEach(button => { button.onclick = () => { if (!saving) $('new-dialog').close(); }; });
$('new-dialog').addEventListener('cancel', event => { if (saving) event.preventDefault(); });
$('open-book').onclick = openBook;
$('prev').onclick = () => turn(-1);
$('next').onclick = () => turn(1);
$('enter').onclick = enter;
$('leave').onclick = leave;
$('write').onclick = write;

document.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape') { if (inScene) leave(); else closeBook(); }
    else if (!isOpen && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openBook(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); turn(1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); turn(-1); }
    else if (event.key === 'Enter') { if (inScene) leave(); else if (page(current).blank) write(); else enter(); }
});

start();
storedDays().then(saved => {
    days.push(...saved.sort((a, b) => a.created - b.created));
}).catch(() => announce('Saved days are unavailable in this browser.'));
