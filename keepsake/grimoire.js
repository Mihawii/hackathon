// The album's binding, re-skinned as an old, sacred book of days: tooled
// oxblood leather, gold filigree and a sigil on the board, gilt edges and
// marbled endpapers. Everything is painted here, so nothing is borrowed.
import * as THREE from 'three';

const TAU = Math.PI * 2;
export const display = '"Cinzel", "Trajan Pro", "Times New Roman", serif';
export const decorative = '"Cinzel Decorative", "Cinzel", "Times New Roman", serif';
export const fell = '"IM Fell English", "Iowan Old Style", Georgia, serif';

function sheet(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

function random(seed) {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function leather(ctx, w, h, seed, base = ['#5c2118', '#3b130d', '#1f0906']) {
    const roll = random(seed);
    const g = ctx.createRadialGradient(w * .55, h * .45, h * .1, w * .55, h * .5, w * .75);
    g.addColorStop(0, base[0]);
    g.addColorStop(.6, base[1]);
    g.addColorStop(1, base[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Mottling from years of hands.
    for (let i = 0; i < 46; i++) {
        const x = roll() * w, y = roll() * h, r = 40 + roll() * 220;
        const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
        blot.addColorStop(0, roll() < .5 ? 'rgba(20,4,2,.22)' : 'rgba(120,52,30,.12)');
        blot.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = blot;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Pebbled grain.
    for (let i = 0; i < w * h / 55; i++) {
        ctx.fillStyle = roll() < .55 ? 'rgba(10,2,0,.16)' : 'rgba(160,80,50,.08)';
        ctx.fillRect(roll() * w, roll() * h, 1 + roll() * 2.4, 1 + roll() * 2.4);
    }
}

function filigreeCorner(g, s) {
    // One corner of tooled ornament, drawn in the corner's own frame.
    g.lineWidth = s * .055;
    g.beginPath();
    g.moveTo(0, s * 1.6); g.lineTo(0, 0); g.lineTo(s * 1.6, 0);
    g.stroke();
    g.beginPath();
    g.moveTo(s * .22, s * 1.25); g.quadraticCurveTo(s * .22, s * .22, s * 1.25, s * .22);
    g.stroke();
    for (const [x, y, r] of [[s * .55, s * .55, s * .2], [s * 1.25, s * .22, s * .1], [s * .22, s * 1.25, s * .1]]) {
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.lineWidth = s * .035;
    for (const flip of [1, -1]) {
        g.save();
        if (flip < 0) { g.rotate(Math.PI / 2); g.scale(1, -1); }
        g.beginPath();
        g.moveTo(s * .75, s * .22);
        g.bezierCurveTo(s * 1.05, s * .62, s * .65, s * .95, s * .55, s * .62);
        g.stroke();
        g.restore();
    }
}

function glyph(g, x, y, s, roll) {
    // An invented rune: two or three strokes on a small grid.
    g.save();
    g.translate(x, y);
    g.beginPath();
    const pts = [[-.5, -.8], [.5, -.8], [0, 0], [-.5, .8], [.5, .8], [0, -.8], [0, .8]];
    let [px, py] = pts[(roll() * pts.length) | 0];
    g.moveTo(px * s, py * s);
    for (let k = 0; k < 3; k++) {
        [px, py] = pts[(roll() * pts.length) | 0];
        g.lineTo(px * s, py * s);
    }
    g.stroke();
    g.restore();
}

function star(g, x, y, r, points = 8, inner = .38) {
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const a = i / (points * 2) * TAU - Math.PI / 2, rr = i % 2 ? r * inner : r;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
}

// Paints every gilded element in white on a transparent layer.
function goldWork(w, h) {
    const c = sheet(w, h), g = c.getContext('2d');
    const roll = random(9127);
    g.fillStyle = g.strokeStyle = '#fff';
    g.lineCap = g.lineJoin = 'round';
    const left = w * .075, right = w * .965, top = h * .045, bottom = h * .955;
    // Double fillets around the board.
    for (const [inset, line] of [[0, 7], [26, 3], [58, 2]]) {
        g.lineWidth = line;
        g.strokeRect(left + inset, top + inset, right - left - inset * 2, bottom - top - inset * 2);
    }
    // Filigree in all four corners.
    const s = h * .11;
    for (const [x, y, sx, sy] of [[left + 40, top + 40, 1, 1], [right - 40, top + 40, -1, 1], [left + 40, bottom - 40, 1, -1], [right - 40, bottom - 40, -1, -1]]) {
        g.save(); g.translate(x, y); g.scale(sx, sy); filigreeCorner(g, s); g.restore();
    }
    // Metal corner guards.
    for (const [x, y, sx, sy] of [[right, top, -1, 1], [right, bottom, -1, -1]]) {
        g.save(); g.translate(x + sx * -10, y + sy * -10); g.scale(sx, sy);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(h * .16, 0); g.quadraticCurveTo(h * .05, h * .05, 0, h * .16); g.closePath(); g.fill();
        g.restore();
    }
    // The sigil: a crescent cradling an eight-pointed star in a ring of runes.
    const cx = (left + right) / 2, cy = h * .56, R = h * .25;
    g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R * .84, 0, TAU); g.stroke();
    g.lineWidth = 2.2; g.beginPath(); g.arc(cx, cy, R * .62, 0, TAU); g.stroke();
    g.lineWidth = 3.4;
    for (let i = 0; i < 28; i++) {
        const a = i / 28 * TAU;
        g.save();
        g.translate(cx + Math.cos(a) * R * .92, cy + Math.sin(a) * R * .92);
        g.rotate(a + Math.PI / 2);
        glyph(g, 0, 0, R * .045, roll);
        g.restore();
    }
    for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU + Math.PI / 16;
        g.lineWidth = i % 2 ? 2 : 4;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * R * .64, cy + Math.sin(a) * R * .64);
        g.lineTo(cx + Math.cos(a) * R * (i % 2 ? .74 : .8), cy + Math.sin(a) * R * (i % 2 ? .74 : .8));
        g.stroke();
    }
    g.beginPath();
    g.arc(cx - R * .05, cy, R * .5, Math.PI * .28, Math.PI * 1.72);
    g.arc(cx + R * .12, cy - R * .02, R * .42, Math.PI * 1.62, Math.PI * .38, true);
    g.closePath();
    g.fill();
    star(g, cx + R * .12, cy - R * .02, R * .26, 8, .34);
    g.beginPath(); g.arc(cx + R * .12, cy - R * .02, R * .045, 0, TAU);
    g.globalCompositeOperation = 'destination-out'; g.fill(); g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 26; i++) {
        const a = roll() * TAU, d = R * (1.12 + roll() * .25);
        star(g, cx + Math.cos(a) * d, cy + Math.sin(a) * d * .82, 3 + roll() * 7, 4, .3);
    }
    // Title and imprint.
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = `700 ${Math.round(h * .095)}px ${decorative}`;
    g.fillText('Little Days', cx, h * .22);
    g.font = `400 ${Math.round(h * .032)}px ${display}`;
    const motto = 'L I B E R   ·   D I E R U M';
    g.fillText(motto, cx, h * .275);
    g.font = `400 ${Math.round(h * .028)}px ${display}`;
    g.fillText('·  M M X X V I  ·', cx, h * .9);
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(cx - w * .16, h * .245); g.lineTo(cx + w * .16, h * .245); g.stroke();
    star(g, cx, h * .245, 9, 4, .3);
    return c;
}

export function paintCover() {
    const w = 2048, h = 1354;
    const color = sheet(w, h), ctx = color.getContext('2d');
    leather(ctx, w, h, 311);
    // Blind-tooled panel and a darker hinge groove beside the spine.
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(w * .055, 0, w * .012, h);
    const gold = goldWork(w, h);
    // Recessed shadow under the gilding so it reads as stamped.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.65)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    const plate = sheet(w, h), pctx = plate.getContext('2d');
    const sheen = pctx.createLinearGradient(0, 0, w, h);
    for (const [t, c] of [[0, '#7a5a22'], [.22, '#e9cf83'], [.4, '#a47c2e'], [.55, '#f5e3a2'], [.75, '#8e6b28'], [1, '#d6b765']]) sheen.addColorStop(t, c);
    pctx.fillStyle = sheen;
    pctx.fillRect(0, 0, w, h);
    pctx.globalCompositeOperation = 'destination-in';
    pctx.drawImage(gold, 0, 0);
    ctx.drawImage(plate, 0, 0);
    ctx.restore();
    // Relief: R bump, G roughness, B metalness.
    const relief = sheet(w, h), rctx = relief.getContext('2d');
    rctx.fillStyle = 'rgb(118,170,0)';
    rctx.fillRect(0, 0, w, h);
    const roll = random(77);
    for (let i = 0; i < w * h / 90; i++) {
        const v = 80 + roll() * 70;
        rctx.fillStyle = `rgb(${v | 0},${150 + roll() * 40 | 0},0)`;
        rctx.fillRect(roll() * w, roll() * h, 2, 2);
    }
    const lift = sheet(w, h), lctx = lift.getContext('2d');
    lctx.fillStyle = 'rgb(235,70,205)';
    lctx.fillRect(0, 0, w, h);
    lctx.globalCompositeOperation = 'destination-in';
    lctx.drawImage(gold, 0, 0);
    rctx.drawImage(lift, 0, 0);
    return { color, relief };
}

export function grainTexture() {
    const c = sheet(512, 512), ctx = c.getContext('2d');
    const roll = random(51);
    ctx.fillStyle = 'rgb(128,128,128)';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
        const v = 70 + roll() * 120 | 0;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.beginPath();
        ctx.arc(roll() * 512, roll() * 512, .8 + roll() * 2.2, 0, TAU);
        ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 4);
    return t;
}

export function marbledPaper() {
    const c = sheet(1024, 1024), ctx = c.getContext('2d');
    const roll = random(404);
    ctx.fillStyle = '#4a1012';
    ctx.fillRect(0, 0, 1024, 1024);
    const inks = ['#7a1d1c', '#2b0a0b', '#b08a3e', '#5b1517', '#1d2a2c'];
    for (let band = 0; band < 160; band++) {
        ctx.strokeStyle = inks[(roll() * inks.length) | 0];
        ctx.globalAlpha = .35 + roll() * .4;
        ctx.lineWidth = 2 + roll() * 9;
        ctx.beginPath();
        const y0 = roll() * 1024, amp = 20 + roll() * 70, f = 1 + roll() * 4, ph = roll() * TAU;
        for (let x = -20; x <= 1044; x += 12) {
            const y = y0 + Math.sin(x / 1024 * TAU * f + ph) * amp + Math.sin(x / 90 + ph) * 8;
            x < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
}

// Re-dress the binding's materials by their names in the model.
export function dressBinding(model, anisotropy) {
    const grain = grainTexture();
    const marble = marbledPaper();
    const seen = new Set();
    model.traverse(item => {
        if (!item.isMesh) return;
        for (const m of Array.isArray(item.material) ? item.material : [item.material]) {
            if (seen.has(m)) continue;
            seen.add(m);
            switch (m.name) {
                case 'Woven midnight cloth':
                    m.color.set('#4a1a12'); m.map = null; m.roughness = .6; m.metalness = 0;
                    m.bumpMap = grain; m.bumpScale = 1.2;
                    break;
                case 'Waxed navy thread': m.color.set('#24100a'); break;
                case 'Burnished antique brass':
                    m.color.set('#e0b85a'); m.metalness = .92; m.roughness = .26; break;
                case 'Flax headband thread': m.color.set('#c99a3e'); m.metalness = .4; m.roughness = .45; break;
                case 'Warm uncoated stock': m.color.set('#e7d2a2'); break;
                case 'Gilded signatures':
                    m.color.set('#f3c45c'); m.metalness = .82; m.roughness = .3; break;
                case 'Inside blue paper':
                    m.color.set('#ffffff'); m.map = marble; m.roughness = .85; break;
                case 'Garnet silk marker': m.color.set('#7d0f16'); m.roughness = .42; break;
                case 'Edge of the woven ribbon': m.color.set('#a3202a'); break;
            }
            m.needsUpdate = true;
        }
    });
    const { color, relief } = paintCover();
    const map = new THREE.CanvasTexture(color);
    map.flipY = false;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = anisotropy;
    const rel = new THREE.CanvasTexture(relief);
    rel.flipY = false;
    rel.anisotropy = anisotropy;
    return { map, relief: rel };
}
