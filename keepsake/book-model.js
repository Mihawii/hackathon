import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createSparkles } from './sparkles.js';
import { dressBinding, display, decorative, fell } from './grimoire.js';
import { createPopupTheatre } from './popup.js';
import bookData from './assets/book-glb.js';

const PAGE = { x: .025, width: 3.159, halfHeight: 1.028, columns: 32, rows: 8 };
const PRINT_W = 1152, PRINT_H = 750;
const serif = fell;
const sans = display;
const cap = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const curve = t => t * t * (3 - 2 * t);
const portion = (v, a, b) => curve(cap((v - a) / (b - a), 0, 1));

const gradeShader = {
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: .38 } },
    vertexShader: `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uVignette;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  float l = dot(c.rgb, vec3(.2126, .7152, .0722));
  c.rgb += vec3(.04, .016, -.028) * smoothstep(.3, 1., l);
  c.rgb += vec3(.018, .012, .007) * (1. - smoothstep(0., .25, l));
  vec2 d = vUv - .5;
  d.x *= 1.2;
  c.rgb *= 1. - uVignette * smoothstep(.22, .9, length(d));
  c.rgb += (hash(vUv * 1371. + fract(uTime) * 61.) - .5) * .03;
  gl_FragColor = vec4(max(c.rgb, 0.), 1.);
}`
};

function canvasOf(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

function correctedDate(value) {
    if (!value) return '';
    const date = new Date(value + 'T12:00:00');
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
}

function imageFrom(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const temporary = source instanceof Blob ? URL.createObjectURL(source) : null;
        const finish = action => {
            image.onload = image.onerror = null;
            if (temporary) URL.revokeObjectURL(temporary);
            action();
        };
        image.onload = () => finish(() => resolve(image));
        image.onerror = () => finish(() => reject(new Error('The album image could not be read.')));
        image.src = temporary || source;
    });
}

function textureFor(canvas, anisotropy, mirror = false) {
    const texture = new THREE.CanvasTexture(canvas);
    // These UVs follow glTF: the top of a sheet is v=0. A verso also
    // exchanges its inner and outer margins when it passes over the spine.
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    if (mirror) {
        texture.repeat.x = -1;
        texture.offset.x = 1;
    }
    return texture;
}

function paperGrain() {
    const c = canvasOf(128, 128), ctx = c.getContext('2d');
    const pixels = ctx.createImageData(c.width, c.height);
    let seed = 3269;
    for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
        const light = seed >>> 31;
        pixels.data[i] = light ? 255 : 88;
        pixels.data[i + 1] = light ? 248 : 74;
        pixels.data[i + 2] = light ? 231 : 54;
        pixels.data[i + 3] = (seed >>> 24) % 21;
    }
    ctx.putImageData(pixels, 0, 0);
    return c;
}

function tracked(ctx, text, x, y, spacing, centered = false) {
    const characters = Array.from(text);
    const width = characters.reduce((n, c) => n + ctx.measureText(c).width, 0);
    let pen = centered ? x - (width + (characters.length - 1) * spacing) / 2 : x;
    for (const c of characters) {
        ctx.fillText(c, pen, y);
        pen += ctx.measureText(c).width + spacing;
    }
}

function diamond(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * .56, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * .56, y);
    ctx.closePath();
    ctx.fill();
}

function drawPaper(ctx, grain, left, label) {
    const w = PRINT_W, h = PRINT_H;
    ctx.fillStyle = left ? '#ecdcb4' : '#efdfb8';
    ctx.fillRect(0, 0, w, h);
    let seed = left ? 811 : 977;
    const roll = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 14; i++) {
        const x = roll() * w, y = roll() * h, r = 30 + roll() * 120;
        const stain = ctx.createRadialGradient(x, y, r * .2, x, y, r);
        stain.addColorStop(0, 'rgba(150,105,50,.07)');
        stain.addColorStop(.8, 'rgba(140,95,45,.05)');
        stain.addColorStop(1, 'rgba(140,95,45,0)');
        ctx.fillStyle = stain;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const burn = ctx.createRadialGradient(w / 2, h / 2, h * .42, w / 2, h / 2, w * .62);
    burn.addColorStop(0, 'rgba(0,0,0,0)');
    burn.addColorStop(.75, 'rgba(120,70,25,.16)');
    burn.addColorStop(1, 'rgba(70,35,10,.5)');
    ctx.fillStyle = burn;
    ctx.fillRect(0, 0, w, h);
    const gutter = ctx.createLinearGradient(left ? w : 0, 0, left ? w * .82 : w * .18, 0);
    gutter.addColorStop(0, 'rgba(80,45,15,.35)');
    gutter.addColorStop(1, 'rgba(80,45,15,0)');
    ctx.fillStyle = gutter;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = ctx.createPattern(grain, 'repeat');
    ctx.fillRect(0, 0, w, h);
    // Gold-ruled frame with knotted corners.
    const inset = 34;
    ctx.strokeStyle = '#9c7631';
    ctx.lineWidth = 3;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(inset + 9, inset + 9, w - inset * 2 - 18, h - inset * 2 - 18);
    ctx.fillStyle = '#9c7631';
    for (const [x, y] of [[inset, inset], [w - inset, inset], [inset, h - inset], [w - inset, h - inset]]) {
        diamond(ctx, x, y, 13);
        ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.lineWidth = 1.4; ctx.stroke();
    }
    ctx.font = '600 21px ' + sans;
    ctx.fillStyle = '#6b4a22';
    tracked(ctx, label, w / 2, 86, 5, true);
    ctx.fillStyle = '#9c7631';
    ctx.fillRect(w / 2 - 230, 98, 160, 1.4);
    ctx.fillRect(w / 2 + 70, 98, 160, 1.4);
    diamond(ctx, w / 2, 99, 6);
    // An upturned corner leaves a small, visible place to pick up the leaf.
    ctx.save();
    ctx.translate(left ? 0 : w, h);
    ctx.scale(left ? 1 : -1, 1);
    const fold = ctx.createLinearGradient(0,-52,48,0);
    fold.addColorStop(0,'#b99b62');
    fold.addColorStop(.39,'#f6e6bf');
    fold.addColorStop(.84,'#d9bf8a');
    ctx.fillStyle = fold;
    ctx.beginPath();
    ctx.moveTo(0,-62);
    ctx.quadraticCurveTo(16,-21,65,0);
    ctx.lineTo(0,0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function linesFor(ctx, value, width) {
    const lines = [];
    for (const paragraph of String(value || '').split(/\r?\n/)) {
        let line = '';
        for (const word of paragraph.trim().split(/\s+/u)) {
            if (!word) continue;
            const trial = line ? line + ' ' + word : word;
            if (ctx.measureText(trial).width <= width) {
                line = trial;
                continue;
            }
            if (line) lines.push(line);
            line = '';
            for (const char of word) {
                if (line && ctx.measureText(line + char).width > width) {
                    lines.push(line);
                    line = '';
                }
                line += char;
            }
        }
        lines.push(line);
    }
    return lines;
}

function ellipsize(ctx, line, width) {
    let value = line.trimEnd();
    while (value && ctx.measureText(value + '…').width > width) value = value.slice(0, -1);
    return value + '…';
}

function drawBlankWriting(ctx, grain) {
    drawPaper(ctx, grain, true, 'NOT YET WRITTEN');
    ctx.fillStyle = '#7a5d39';
    ctx.font = 'italic 52px ' + serif;
    ctx.textAlign = 'center';
    ctx.fillText('Every day ends somewhere.', PRINT_W / 2, 330);
    ctx.font = 'italic 40px ' + serif;
    ctx.fillStyle = '#8b7652';
    ctx.fillText('Keep this one before it slips', PRINT_W / 2, 400);
    ctx.fillText('outside the frame.', PRINT_W / 2, 452);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a7804c';
    diamond(ctx, PRINT_W / 2, 530, 7);
}

function drawBlankPicture(ctx, grain) {
    drawPaper(ctx, grain, false, 'A NEW PAGE');
    const x = 250, y = 170, w = PRINT_W - 500, h = 330;
    ctx.save();
    ctx.setLineDash([10, 12]);
    ctx.strokeStyle = '#b09468';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
    // A feather quill drawn in the gutter of the empty mount.
    ctx.save();
    ctx.translate(PRINT_W / 2, y + h / 2);
    ctx.rotate(-.55);
    ctx.fillStyle = '#d9c49b';
    ctx.beginPath();
    ctx.moveTo(-120, 0);
    ctx.quadraticCurveTo(-20, -46, 120, -8);
    ctx.quadraticCurveTo(10, 30, -120, 0);
    ctx.fill();
    ctx.strokeStyle = '#7d6440';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-150, 6);
    ctx.lineTo(130, -10);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#463e31';
    ctx.font = 'italic 44px ' + serif;
    ctx.textAlign = 'center';
    ctx.fillText('Touch the page to write a new day', PRINT_W / 2, y + h + 80);
    ctx.font = '500 21px ' + sans;
    ctx.fillStyle = '#776749';
    tracked(ctx, 'WORDS  ·  A PHOTOGRAPH  ·  A SONG', PRINT_W / 2, y + h + 130, 2.7, true);
    ctx.textAlign = 'left';
    return { u: x / PRINT_W, v: y / PRINT_H, w: w / PRINT_W, h: h / PRINT_H };
}

function drawWriting(ctx, day, grain) {
    if (day.blank) return drawBlankWriting(ctx, grain);
    drawPaper(ctx, grain, true, 'FIELD NOTES');
    const x = 76, width = PRINT_W - x - 86;
    ctx.fillStyle = '#7a5d39';
    ctx.font = '500 25px ' + sans;
    tracked(ctx, correctedDate(day.date).toLocaleUpperCase(), x, 147, 2.2);
    const heading = day.title || '';
    let size = 62, titleLines;
    do {
        ctx.font = '600 ' + size + 'px ' + display;
        titleLines = linesFor(ctx, heading, width);
        if (titleLines.length <= 2 || size <= 46) break;
        size -= 4;
    } while (true);
    ctx.fillStyle = '#4a1510';
    const titleCount = Math.min(2, titleLines.length);
    let baseline = 232;
    for (let i = 0; i < titleCount; i++) {
        const text = i === titleCount - 1 && titleLines.length > titleCount ? ellipsize(ctx, titleLines[i], width) : titleLines[i];
        ctx.fillText(text, x, baseline);
        baseline += size * .98;
    }
    const ruleY = baseline - size * .48;
    ctx.fillStyle = '#a7804c';
    ctx.fillRect(x, ruleY, 62, 2.6);
    diamond(ctx, x + 72, ruleY + 1, 4.8);

    const top = ruleY + 56, bottom = 595;
    let bodySize = 47, bodyLines, lineHeight;
    do {
        ctx.font = bodySize + 'px ' + serif;
        bodyLines = linesFor(ctx, day.text, width);
        lineHeight = bodySize * 1.23;
        if (bodyLines.length * lineHeight <= bottom - top + lineHeight || bodySize <= 37) break;
        bodySize -= 2;
    } while (true);
    const story = String(day.text || '').trim();
    const initial = story.charAt(0);
    const capSize = lineHeight * 2.05, capBox = capSize * 1.02;
    // The first letter is set as a gilded initial two lines deep.
    const indent = capBox + 18;
    const opening = linesFor(ctx, story.slice(1), width - indent);
    const firstTwo = opening.slice(0, 2);
    const rest = linesFor(ctx, opening.slice(2).join(' '), width);
    const lines = [...firstTwo, ...rest];
    if (initial) {
        const bx = x, by = top - bodySize * .95;
        ctx.fillStyle = '#5e1712';
        ctx.fillRect(bx, by, capBox, capBox);
        ctx.strokeStyle = '#c9a24c';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx + 4, by + 4, capBox - 8, capBox - 8);
        ctx.fillStyle = '#e6c46e';
        ctx.font = '700 ' + Math.round(capSize * .78) + 'px ' + decorative;
        ctx.textAlign = 'center';
        ctx.fillText(initial.toLocaleUpperCase(), bx + capBox / 2, by + capBox * .78);
        ctx.textAlign = 'left';
        ctx.font = bodySize + 'px ' + serif;
    }
    ctx.fillStyle = '#3a2a18';
    const count = Math.max(1, Math.floor((bottom - top) / lineHeight) + 1);
    lines.slice(0, count).forEach((line, i) => {
        const lx = i < 2 && initial ? x + indent : x;
        ctx.fillText(i === count - 1 && lines.length > count ? ellipsize(ctx, line, width) : line, lx, top + i * lineHeight);
    });
    if (day.song) {
        ctx.fillStyle = '#a18458';
        ctx.fillRect(x, 635, width, 1.4);
        ctx.font = '500 19px ' + sans;
        ctx.fillStyle = '#786749';
        tracked(ctx, 'SOUNDTRACK', x, 693, 3.2);
        ctx.font = 'italic 37px ' + serif;
        ctx.fillStyle = '#354b47';
        const song = String(day.song);
        ctx.fillText(ctx.measureText(song).width > width-200 ? ellipsize(ctx, song, width-200) : song, x+203, 697);
    }
}

function photoCorner(ctx, x, y, flipX, flipY) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flipX, flipY);
    ctx.shadowColor = 'rgba(47,30,14,.32)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#b88a35';
    ctx.beginPath();
    ctx.moveTo(-3, -3);
    ctx.lineTo(37, -3);
    ctx.lineTo(-3, 37);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#b79865';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(1,29);
    ctx.lineTo(29,1);
    ctx.stroke();
    ctx.restore();
}

function drawPicture(ctx, day, index, image, grain, empty = false) {
    if (day.blank) return drawBlankPicture(ctx, grain);
    drawPaper(ctx, grain, false, 'PHOTOGRAPH');
    const ratio = image?.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1.75;
    const w = Math.min(PRINT_W - 194, 429 * ratio), h = w / ratio;
    const x = (PRINT_W - w) / 2, y = 351 - h / 2;
    const mat = 16, lower = 64;
    ctx.save();
    ctx.fillStyle = '#f3e6c4';
    ctx.shadowColor = 'rgba(58,42,24,.45)';
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 9;
    ctx.shadowBlur = 18;
    ctx.fillRect(x - mat, y - mat, w + 2 * mat, h + mat + lower);
    ctx.restore();
    ctx.strokeStyle = '#cfbea1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - mat, y - mat, w + 2 * mat, h + mat + lower);
    ctx.fillStyle = empty ? '#e6d8bb' : day.tint || '#bfa877';
    ctx.fillRect(x, y, w, h);
    if (image && !empty) ctx.drawImage(image, x, y, w, h);
    if (empty) {
        ctx.strokeStyle = 'rgba(120,95,60,.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
    }
    for (const [cx, cy, sx, sy] of [[x-mat,y-mat,1,1], [x+w+mat,y-mat,-1,1],
        [x-mat,y+h+lower,1,-1], [x+w+mat,y+h+lower,-1,-1]]) {
        photoCorner(ctx, cx, cy, sx, sy);
    }
    const labelMax = w - 18;
    ctx.fillStyle = '#463e31';
    ctx.font = 'italic 36px ' + serif;
    const caption = String(day.caption || correctedDate(day.date));
    ctx.fillText(ctx.measureText(caption).width > labelMax ? ellipsize(ctx, caption, labelMax) : caption,
        x + 8, y + h + 43);
    const count = Math.max(1, day.photos?.length || 1);
    ctx.fillStyle = '#776749';
    ctx.font = '500 21px ' + sans;
    tracked(ctx, String(index + 1).padStart(2, '0') + '  /  ' + String(count).padStart(2, '0'),
        PRINT_W / 2, 699, 2.7, true);
    ctx.fillStyle = '#a18250';
    diamond(ctx, PRINT_W / 2 - 103, 690, 5);
    diamond(ctx, PRINT_W / 2 + 103, 690, 5);
    return { u: x / PRINT_W, v: y / PRINT_H, w: w / PRINT_W, h: h / PRINT_H };
}

function pageSignature(day, index) {
    return [day, index, day.photos?.[index], day.photos?.length, day.title, day.date, day.text, day.caption, day.song, day.tint];
}

function printSpread(day, index, grain, anisotropy, invalidate) {
    const writing = canvasOf(PRINT_W, PRINT_H);
    const picture = canvasOf(PRINT_W, PRINT_H);
    const leftCtx = writing.getContext('2d'), rightCtx = picture.getContext('2d');
    drawWriting(leftCtx, day, grain);
    const left = textureFor(writing, anisotropy, true);
    const right = textureFor(picture, anisotropy);
    const signature = pageSignature(day, index);
    const spread = {
        left, right, box: drawPicture(rightCtx, day, index, null, grain), hasPhoto: false,
        disposed: false, day, index, image: null,
        showPrint(visible) {
            if (!this.image || this.disposed) return;
            drawPicture(rightCtx, day, index, this.image, grain, !visible);
            right.needsUpdate = true;
        },
        matches(candidate, i) {
            return !!candidate && pageSignature(candidate, i).every((v, j) => v === signature[j]);
        },
        dispose() {
            this.disposed = true;
            left.dispose();
            right.dispose();
            writing.width = picture.width = 1;
        }
    };
    const source = day.photos?.[index];
    if (source) imageFrom(source).then(image => {
        if (spread.disposed) return;
        spread.box = drawPicture(rightCtx, day, index, image, grain);
        spread.image = image;
        spread.hasPhoto = true;
        right.needsUpdate = true;
        invalidate();
    }).catch(() => { /* The written entry stays available when its photograph is unreadable. */ });
    return spread;
}

function studioReflection() {
    const w = 128, h = 64, data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const u = x / w, v = y / h;
            const window = Math.exp(-Math.pow((u-.23)/.115, 4) - Math.pow((v-.55)/.27, 4));
            const card = Math.exp(-Math.pow((u-.75)/.19, 4) - Math.pow((v-.68)/.18, 4));
            const i = (y * w + x) * 4;
            for (let k = 0; k < 3; k++) {
                data[i+k] = Math.min(255, [44,49,53][k] + v*[43,42,36][k] + window*[142,130,103][k] + card*[67,66,69][k]);
            }
            data[i+3] = 255;
        }
    }
    const texture = new THREE.DataTexture(data, w, h);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
}

function shadowInk() {
    const c = canvasOf(384, 512), ctx = c.getContext('2d');
    ctx.fillStyle = '#211a16';
    ctx.shadowColor = 'rgba(35,24,15,.82)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 7;
    ctx.shadowOffsetY = 12;
    ctx.fillRect(36, 37, 307, 422);
    return new THREE.CanvasTexture(c);
}

function paperMaterial(side) {
    return new THREE.MeshStandardMaterial({ color: 0xfffbf4, side, roughness: .93, metalness: 0 });
}

function printOn(material, texture) {
    if (material.map === texture) return;
    if (!material.map || !texture) material.needsUpdate = true;
    material.map = texture;
}

function shapeSheet(geometry, turn, opening, height = 0, cornerBias = 0) {
    const positions = geometry.attributes.position;
    const cols = PAGE.columns, rows = PAGE.rows;
    const angle = Math.PI * turn, curl = Math.sin(angle);
    const resting = opening * (1 - curl*.62);
    for (let row = 0; row <= rows; row++) {
        const across = row / rows;
        const y = (across-.5)*PAGE.halfHeight*2;
        let x = PAGE.x, z = height;
        for (let col = 0; col <= cols; col++) {
            const u = col / cols;
            if (col) {
                const section = (col-.5)/cols;
                // Integrating the strip tangents preserves sheet length while
                // the fore edge lags the gutter and the head turns before the tail.
                const tangent = angle + curl * (1.67*section - .72 + (across-.5)*(.34 + 1.8*cornerBias)*section);
                x += Math.cos(tangent) * PAGE.width / cols;
                z += Math.sin(tangent) * PAGE.width / cols;
            }
            const shoulder = resting * (.19*Math.sin(Math.PI*u)*Math.exp(-3.5*u) + .012*Math.sin(Math.PI*u));
            positions.setXYZ(row*(cols+1)+col, x, y + curl*.041*Math.sin(u*Math.PI)*(across-.5), z + shoulder);
        }
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
}

function pointOnSheet(geometry, u, topV, out) {
    const cx = cap(u,0,1)*PAGE.columns, cy = (1-cap(topV,0,1))*PAGE.rows;
    const x = Math.min(PAGE.columns - 1, Math.floor(cx));
    const y = Math.min(PAGE.rows - 1, Math.floor(cy));
    const i = y*(PAGE.columns+1)+x, j = i+PAGE.columns+1;
    const p = geometry.attributes.position;
    const fx = cx-x, fy = cy-y;
    for (const [component, get] of [['x','getX'],['y','getY'],['z','getZ']]) {
        out[component] = mix(mix(p[get](i),p[get](i+1),fx), mix(p[get](j),p[get](j+1),fx), fy);
    }
    return out;
}

// Adapted from 3D Animation/3, cinematic-scene-showcase.tsx. A timed sequence
// interpolates both the camera position and a separate point of regard. Here
// the binding drives the sequence; the middle pose follows the lifted board.
const viewpoints = [
    { t: 0, target: [1.63,0,.06], azimuth: 0, elevation: -.34, roll: 0, w: 3.4, h: 2.3 },
    { t: .48, target: [.8,0,.7], azimuth: .02, elevation: -.4, roll: 0, w: 4.9, h: 2.8 },
    { t: 1, target: [0,-.03,.05], azimuth: 0, elevation: -.46, roll: 0, w: 6.6, h: 2.3 }
];

function disposeTree(object) {
    const meshes = new Set(), materials = new Set(), textures = new Set();
    object?.traverse(child => {
        if (child.geometry) meshes.add(child.geometry);
        if (child.material) {
            for (const mat of Array.isArray(child.material) ? child.material : [child.material]) materials.add(mat);
        }
    });
    for (const material of materials) {
        for (const item of Object.values(material)) if (item?.isTexture) textures.add(item);
        material.dispose();
    }
    for (const item of meshes) item.dispose();
    for (const item of textures) {
        item.dispose();
        item.source?.data?.close?.();
    }
}

function setUpBook(renderer, model, host, callbacks, removeLossListener) {
    const canvas = renderer.domElement;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 45);
    const axes = new THREE.Vector3(), target = new THREE.Vector3(), sample = new THREE.Vector3();
    const grain = paperGrain();
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    scene.environment = studioReflection();
    scene.environmentIntensity = .51;
    scene.add(model);

    const hemi = new THREE.HemisphereLight(0xfff7e6, 0xafb3ba, 1.08);
    const key = new THREE.DirectionalLight(0xffdcae, 2.15);
    key.position.set(-3.9, 5.4, 6.1);
    key.target.position.set(.35,-.12,0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048,2048);
    Object.assign(key.shadow.camera, { left: -5.2, right: 5.2, top: 4.2, bottom: -4.2, near: 1, far: 16 });
    key.shadow.bias = -.00032;
    key.shadow.normalBias = .011;
    key.shadow.radius = 5;
    const rim = new THREE.DirectionalLight(0xd3e1ec, .91);
    rim.position.set(3.8, -.8, 2.7);
    scene.add(hemi, key, key.target, rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(32,32),
        new THREE.ShadowMaterial({ color: 0x372d26, opacity: .24, transparent: true, depthWrite: false }));
    ground.position.z = -.229;
    ground.receiveShadow = true;
    ground.renderOrder = -1;
    scene.add(ground);
    const circleCanvas = canvasOf(1024, 1024), cc = circleCanvas.getContext('2d');
    cc.translate(512, 512);
    cc.strokeStyle = cc.fillStyle = 'rgba(255,218,150,1)';
    cc.shadowColor = 'rgba(255,190,90,.9)';
    cc.shadowBlur = 10;
    for (const [r, w] of [[500, 2.2], [486, 1], [392, 1.6], [378, .8]]) {
        cc.lineWidth = w; cc.beginPath(); cc.arc(0, 0, r, 0, Math.PI * 2); cc.stroke();
    }
    for (let i = 0; i < 120; i++) {
        const a = i / 120 * Math.PI * 2;
        cc.beginPath(); cc.arc(Math.cos(a) * 312, Math.sin(a) * 312, i % 10 ? 1.6 : 3.4, 0, Math.PI * 2); cc.fill();
    }
    let runeSeed = 77;
    const runeRoll = () => (runeSeed = (Math.imul(runeSeed, 1664525) + 1013904223) >>> 0) / 4294967296;
    cc.lineWidth = 2;
    for (let i = 0; i < 54; i++) {
        cc.save();
        cc.rotate(i / 54 * Math.PI * 2);
        cc.translate(0, -439);
        cc.beginPath();
        for (let k = 0; k < 3; k++) {
            const x = (runeRoll() - .5) * 18, y = (runeRoll() - .5) * 30;
            k ? cc.lineTo(x, y) : cc.moveTo(x, y);
        }
        cc.stroke();
        cc.restore();
    }
    const magicCircle = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(circleCanvas), transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false }));
    magicCircle.position.set(1.63, 0, -.226);
    magicCircle.renderOrder = -1;
    scene.add(magicCircle);
    const ink = shadowInk();
    function contact() {
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.01,2.85),
            new THREE.MeshBasicMaterial({ map: ink, transparent: true, opacity: .18,
                depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
        plane.renderOrder = -2;
        plane.position.set(1.64,-.038,-.228);
        scene.add(plane);
        return plane;
    }
    const rightShadow = contact(), leftShadow = contact();

    model.traverse(item => {
        if (!item.isMesh) return;
        item.castShadow = true;
        item.receiveShadow = true;
        for (const material of Array.isArray(item.material) ? item.material : [item.material]) {
            if (material.map) material.map.anisotropy = anisotropy;
        }
    });
    model.getObjectByName('Foil_title').castShadow = false;
    model.getObjectByName('Foil_title').visible = false;
    const jacket = model.getObjectByName('Cover_illustration').material;
    {
        const dressed = dressBinding(model, anisotropy);
        jacket.map = dressed.map;
        jacket.color.set('#ffffff');
        jacket.bumpMap = jacket.metalnessMap = jacket.roughnessMap = dressed.relief;
        jacket.bumpScale = 1.4;
        jacket.roughness = jacket.metalness = 1;
        jacket.needsUpdate = true;
    }
    const hinge = model.getObjectByName('Front_hinge');
    const upperStack = model.getObjectByName('Front_signatures_hinge');
    const spine = model.getObjectByName('Spine');
    const flyleaves = Array.from({ length: 5 }, (_, i) => model.getObjectByName('Flyleaf_' + i));
    const stock = flyleaves[0].geometry;
    const binding = flyleaves[0].parent;
    for (const leaf of flyleaves) {
        leaf.geometry = stock.clone();
        leaf.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
        leaf.position.set(0,0,0);
    }
    function face(name, geometry, material, parent = binding) {
        const page = new THREE.Mesh(geometry, material);
        page.name = name;
        page.castShadow = true;
        page.receiveShadow = true;
        parent.add(page);
        return page;
    }
    // Recto and verso share vertices. Independent materials put the story
    // on the underside of the same sheet that opens onto the left.
    flyleaves[0].material = paperMaterial(THREE.FrontSide);
    const left = face('Written_verso', flyleaves[0].geometry, paperMaterial(THREE.BackSide));
    const right = face('Photographic_recto', stock.clone(), paperMaterial(THREE.FrontSide));
    const sparkles = createSparkles(scene);
    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
    composer.addPass(new RenderPass(scene, camera));
    const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0, maxblur: .009 });
    bokeh.enabled = false;
    composer.addPass(bokeh);
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .5, .2, 1.12);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const grade = new ShaderPass(gradeShader);
    composer.addPass(grade);
    let flashAt = -10, flashPower = 0;
    const popup = createPopupTheatre({ parent: binding, sparkles, invalidate: () => invalidate(),
        flash(power = 1.4) { flashAt = clock; flashPower = power; } });
    const turningSheet = new THREE.Group();
    binding.add(turningSheet);
    turningSheet.visible = false;
    const recto = face('Turning_recto', stock.clone(), paperMaterial(THREE.FrontSide), turningSheet);
    recto.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    const verso = face('Turning_verso', recto.geometry, paperMaterial(THREE.BackSide), turningSheet);
    stock.dispose();

    let active = true, disposed = false, openTarget = false, openness = 0;
    let opening = null, turning = null, spread = null, relief = null;
    let frameId = 0, lastFrame = null, width = 0, height = 0;
    let drag = null, orbitX = 0, orbitY = 0, wantedX = 0, wantedY = 0, speedX = 0, speedY = 0;
    let clock = 0, sceneOn = false, stageFrame = null, wasOpening = false;
    let arrival = reduced.matches ? 1 : 0, arrived = arrival >= 1, sealGlow = 0;
    let hoverPhoto = false, hoverGlow = 0;
    let lastInput = performance.now(), peek = null, glowFor = null;
    const glowCanvas = canvasOf(512, 320), glowCtx = glowCanvas.getContext('2d');
    glowCtx.shadowColor = 'rgba(255,205,110,1)';
    glowCtx.shadowBlur = 26;
    glowCtx.strokeStyle = 'rgba(255,226,160,1)';
    glowCtx.lineWidth = 7;
    glowCtx.strokeRect(34, 34, 444, 252);
    glowCtx.strokeRect(34, 34, 444, 252);
    const photoGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(glowCanvas), transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false }));
    photoGlow.renderOrder = 5;
    photoGlow.visible = false;
    const shineCanvas = canvasOf(256, 160), shineCtx = shineCanvas.getContext('2d');
    const shineGrad = shineCtx.createRadialGradient(128, 80, 10, 128, 80, 150);
    shineGrad.addColorStop(0, 'rgba(255,240,205,1)');
    shineGrad.addColorStop(1, 'rgba(255,220,160,.35)');
    shineCtx.fillStyle = shineGrad;
    shineCtx.fillRect(0, 0, 256, 160);
    const photoShine = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(shineCanvas), transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false }));
    photoShine.renderOrder = 6;
    photoShine.visible = false;
    binding.add(photoGlow);
    binding.add(photoShine);
    const focus = { amount: 0, from: 0, to: 0, start: 0, duration: 1 };
    const focusPoint = new THREE.Vector3(), mote = new THREE.Vector3();
    const ray = new THREE.Raycaster(), pointerNDC = new THREE.Vector2();
    const listeners = new AbortController();
    const viewRight = new THREE.Vector3(), viewUp = new THREE.Vector3();
    const projectedSamples = [];
    const occupied = { left:0, right:0, top:0, bottom:0 };

    function invalidate() {
        if (!disposed && active && !document.hidden && !frameId) frameId = requestAnimationFrame(frame);
    }

    function bindCover() {
        const board = portion(openness, 0, .82);
        const signatures = portion(openness, .08, .875);
        hinge.rotation.y = -Math.PI * .998 * board;
        hinge.position.z = mix(.164,-.164,board);
        upperStack.rotation.y = -Math.PI * signatures;
        upperStack.position.z = mix(.068,-.068,signatures);
        // The hollow back compresses to the lower half of the open binding.
        spine.scale.z = mix(1,.59,openness);
        spine.position.z = -.073*openness;
        leftShadow.scale.x = Math.max(.065, Math.abs(Math.cos(board*Math.PI)));
        leftShadow.position.x = 1.64*Math.cos(board*Math.PI) + .04;
        leftShadow.userData.strength = .17*board*board * leftShadow.scale.x;
        for (let i = 0; i < flyleaves.length; i++) {
            const order = flyleaves.length - i - 1;
            const swing = portion(openness, .22 + order*.042, .80 + order*.048);
            const z = mix(.001 + i*.001, .021 - i*.003, openness);
            shapeSheet(flyleaves[i].geometry, swing, openness, z);
        }
        shapeSheet(right.geometry, 0, openness, mix(-.004,.014,openness));
    }

    function placeCamera() {
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        const [a,b] = openness <= viewpoints[1].t ? [viewpoints[0],viewpoints[1]] : [viewpoints[1],viewpoints[2]];
        const t = curve((openness-a.t)/(b.t-a.t));
        for (let i = 0; i < 3; i++) target.setComponent(i, mix(a.target[i], b.target[i], t));
        let azimuth = mix(a.azimuth,b.azimuth,t) + orbitX;
        let elevation = cap(mix(a.elevation,b.elevation,t) + orbitY, -1.14, 1.14);
        // On a portrait screen the book lies sideways so its long edge uses
        // the long side of the display; the pop-up stage turns back upright.
        const portrait = camera.aspect < .82;
        let roll = mix(a.roll,b.roll,t) - (portrait ? Math.PI/2 : 0);
        const visibleHeight = portrait ? Math.max(mix(a.w,b.w,t), mix(a.h,b.h,t)/camera.aspect)
            : Math.max(mix(a.h,b.h,t), mix(a.w,b.w,t)/camera.aspect);
        const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), tanX = tanY*camera.aspect;
        let distance = visibleHeight/(2*tanY);
        const f = stageFrame ? curve(cap(focus.amount,0,1)) : 0;
        let focusDistance = distance;
        if (f > 0) {
            binding.updateWorldMatrix(true,false);
            focusPoint.set(stageFrame.origin.x, stageFrame.origin.y + stageFrame.H*.5, stageFrame.origin.z + stageFrame.H*.47);
            binding.localToWorld(focusPoint);
            target.lerp(focusPoint,f);
            azimuth = mix(azimuth, orbitX*1.6, f);
            elevation = mix(elevation, -1.0 + orbitY*1.4, f);
            roll = mix(roll, 0, f);
            focusDistance = Math.max(stageFrame.H*1.95, stageFrame.W*1.42/camera.aspect)/(2*tanY);
        }
        axes.set(Math.sin(azimuth)*Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth)*Math.cos(elevation));
        camera.position.copy(target).add(axes);
        camera.up.set(Math.sin(roll), Math.cos(roll), 0);
        camera.lookAt(target);
        viewRight.set(1,0,0).applyQuaternion(camera.quaternion);
        viewUp.set(0,1,0).applyQuaternion(camera.quaternion);
        model.updateWorldMatrix(true,true);
        let count = 0;
        model.traverseVisible(mesh => {
            if (!mesh.isMesh) return;
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const {min,max} = mesh.geometry.boundingBox;
            for (let i = 0; i < 8; i++) {
                sample.set(i&1 ? max.x : min.x,i&2 ? max.y : min.y,i&4 ? max.z : min.z)
                    .applyMatrix4(mesh.matrixWorld).sub(target);
                const x = sample.dot(viewRight), y = sample.dot(viewUp), depth = sample.dot(axes);
                projectedSamples[count++] = x;
                projectedSamples[count++] = y;
                projectedSamples[count++] = depth;
                // Solve the frustum inequalities for camera distance at the
                // current pose. This includes the ribbon and the lifted leaf.
                distance = Math.max(distance, depth+Math.abs(x)/(tanX*.95), depth+Math.abs(y)/(tanY*.92));
            }
        });
        occupied.left = occupied.top = Infinity;
        occupied.right = occupied.bottom = -Infinity;
        for (let i = 0; i < count; i+=3) {
            const d = distance-projectedSamples[i+2];
            const u = .5 + projectedSamples[i]/(2*d*tanX), v = .5 - projectedSamples[i+1]/(2*d*tanY);
            occupied.left = Math.min(occupied.left,u); occupied.right = Math.max(occupied.right,u);
            occupied.top = Math.min(occupied.top,v); occupied.bottom = Math.max(occupied.bottom,v);
        }
        distance = mix(distance, focusDistance, f);
        camera.position.copy(target).addScaledVector(axes,distance);
        camera.updateMatrixWorld();
        const shadowVisibility = cap((axes.z+.04)*3, 0, 1);
        ground.material.opacity = .25*shadowVisibility;
        rightShadow.material.opacity = .23*shadowVisibility;
        leftShadow.material.opacity = (leftShadow.userData.strength || 0)*shadowVisibility;
    }

    function showSpread(record) {
        printOn(left.material, record?.left || null);
        printOn(right.material, record?.right || null);
    }

    function finishTurn(commit) {
        if (!turning) return;
        const change = turning;
        turning = null;
        turningSheet.visible = false;
        printOn(recto.material, null);
        printOn(verso.material, null);
        if (commit) {
            const past = spread;
            spread = change.next;
            showSpread(spread);
            past?.dispose();
        } else {
            showSpread(spread);
            change.next.dispose();
        }
        change.resolve(commit);
        if (commit && change.interactive) callbacks.onTurn?.(change.forward ? 1 : -1);
        invalidate();
    }

    function stopOrbit() {
        wantedX = wantedY = speedX = speedY = 0;
        if (reduced.matches || !active) orbitX = orbitY = 0;
        releasePointer();
    }

    function setState({ open, day, photoIndex = 0 }) {
        if (disposed) return;
        if (drag?.kind === 'page') releasePointer();
        finishTurn(false);
        if (day) {
            const index = cap(Math.trunc(photoIndex) || 0, 0, Math.max(0, (day.photos?.length || 1)-1));
            if (!spread?.matches(day, index)) {
                const prior = spread;
                spread = printSpread(day,index,grain,anisotropy,invalidate);
                showSpread(spread);
                prior?.dispose();
            }
        }
        if (typeof open === 'boolean' && openTarget !== open) {
            openTarget = open;
            stopOrbit();
            const to = Number(open);
            if (reduced.matches || !active || document.hidden) {
                openness = to;
                opening = null;
                bindCover();
            } else {
                opening = { from: openness, to, start: performance.now(),
                    duration: (open ? 1580 : 1250)*Math.pow(Math.abs(to-openness),.69) };
            }
        }
        invalidate();
    }

    function beginTurn(direction, nextDay, interactive = false, held = false, corner = 0) {
        if (disposed || !openTarget || !spread || !nextDay || !direction) return Promise.resolve(false);
        finishTurn(false);
        if (opening) {
            opening = null;
            openness = 1;
            bindCover();
        }
        const next = printSpread(nextDay,0,grain,anisotropy,invalidate);
        return new Promise(resolve => {
            const forward = direction > 0;
            turning = { forward, next, start:performance.now(), duration:920, resolve, interactive,
                held, corner, progress:0, from:0, to:1 };
            if ((!held && reduced.matches) || !active || document.hidden) {
                finishTurn(true);
                return;
            }
            // Expose the next stationary surface underneath the sheet before
            // it lifts. Its opposite side physically carries the new printing.
            printOn(recto.material, forward ? spread.right : next.right);
            printOn(verso.material, forward ? next.left : spread.left);
            if (forward) printOn(right.material, next.right);
            else printOn(left.material, next.left);
            turningSheet.visible = true;
            shapeSheet(recto.geometry, forward ? 0 : 1, 1, .034);
            invalidate();
        });
    }

    function turn(direction, nextDay) {
        lastInput = performance.now();
        if (peek) { peek = null; finishTurn(false); }
        if (drag) releasePointer();
        return beginTurn(direction,nextDay);
    }

    function setTurnProgress(progress) {
        if (!turning) return;
        turning.progress = cap(progress,0,1);
        const amount = turning.forward ? turning.progress : 1-turning.progress;
        const bias = (turning.forward ? 1 : -1)*turning.corner;
        shapeSheet(recto.geometry,amount,1,.034+.025*Math.sin(amount*Math.PI),bias);
        invalidate();
    }

    function letGo(commit) {
        if (!turning) return;
        turning.held = false;
        turning.from = turning.progress;
        turning.to = commit ? 1 : 0;
        turning.start = performance.now();
        turning.duration = (commit ? 410 : 480)*(.62+.38*Math.abs(turning.from-turning.to));
        turning.spring = !commit;
        if (reduced.matches || !active || document.hidden) finishTurn(commit);
        else invalidate();
    }

    function frame(now) {
        frameId = 0;
        if (disposed || !active || document.hidden) return;
        const dt = lastFrame === null ? 1/60 : cap((now-lastFrame)/1000, .001, .046);
        lastFrame = now;
        clock += dt;
        if (!reduced.matches) {
            key.intensity = 2.15 * (1 + .045 * Math.sin(clock * 7.3) + .03 * Math.sin(clock * 12.7 + 1.3) + .02 * Math.sin(clock * 23.1));
            if (Math.random() < dt * (openTarget ? 5 : 2.5)) {
                mote.set((Math.random() - .5) * (openTarget ? 6.4 : 3.2) + (openTarget ? 0 : 1.63), (Math.random() - .5) * 2.1, .1);
                sparkles.emit(mote, 1, .12, Math.random() < .5 ? 0xffd89a : 0xffc76a, .45);
            }
        }
        if (focus.amount !== focus.to) {
            const t = cap((now-focus.start)/focus.duration,0,1);
            focus.amount = t >= 1 ? focus.to : mix(focus.from,focus.to,curve(t));
        }
        if (opening && !reduced.matches && opening.to === 1) {
            hinge.updateWorldMatrix(true,false);
            for (let i = 0; i < 3; i++) {
                mote.set(3.1, (Math.random()-.5)*2.1, .02);
                sparkles.emit(hinge.localToWorld(mote), 1, .28);
            }
            wasOpening = true;
        } else if (wasOpening && !opening) {
            wasOpening = false;
            if (openTarget) for (let i = 0; i < 26; i++) {
                mote.set(0, (Math.random()-.5)*2.05, .05);
                binding.updateWorldMatrix(true,false);
                sparkles.emit(binding.localToWorld(mote), 3, .9, null, 1.6);
            }
        }
        if (turning && turningSheet.visible && !reduced.matches) {
            binding.updateWorldMatrix(true,false);
            for (let i = 0; i < 2; i++) {
                pointOnSheet(recto.geometry, 1, Math.random(), mote);
                sparkles.emit(binding.localToWorld(mote), 1, .22);
            }
        }
        const idle = openTarget && openness >= 1 && !sceneOn && !drag && active && !reduced.matches;
        if (idle && !turning && !peek && now - lastInput > 3800 && callbacks.neighbor?.(1)) {
            lastInput = now;
            peek = { start: now };
            beginTurn(1, callbacks.neighbor(1), false, true, -.75);
        }
        if (peek && turning?.held && !drag) {
            const t = (now - peek.start) / 1500;
            setTurnProgress(.085 * Math.sin(Math.min(1, t) * Math.PI));
            if (t >= 1) { peek = null; finishTurn(false); }
        } else if (peek && !turning) peek = null;
        const showGlow = idle && !turning && spread?.hasPhoto && !spread.day?.blank;
        photoGlow.visible = Boolean(showGlow);
        if (showGlow) {
            if (glowFor !== spread) {
                glowFor = spread;
                const b = spread.box;
                const a = pointOnSheet(right.geometry, b.u, b.v + b.h, new THREE.Vector3());
                const c = pointOnSheet(right.geometry, b.u + b.w, b.v, new THREE.Vector3());
                photoGlow.position.set((a.x + c.x) / 2, (a.y + c.y) / 2, Math.max(a.z, c.z) + .012);
                photoGlow.scale.set(Math.abs(c.x - a.x) * 1.16, Math.abs(c.y - a.y) * 1.26, 1);
                photoShine.position.copy(photoGlow.position).setZ(photoGlow.position.z + .002);
                photoShine.scale.set(Math.abs(c.x - a.x), Math.abs(c.y - a.y), 1);
            }
            hoverGlow = mix(hoverGlow, hoverPhoto ? 1 : 0, 1 - Math.exp(-12 * dt));
            photoGlow.material.opacity = (.22 + .3 * (.5 + .5 * Math.sin(clock * 2.6))) * (1 - hoverGlow) + 1 * hoverGlow;
            photoShine.material.opacity = .26 * hoverGlow;
            if (hoverPhoto && Math.random() < dt * 14) {
                mote.set(photoGlow.position.x + (Math.random() - .5) * photoShine.scale.x, photoGlow.position.y + (Math.random() - .5) * photoShine.scale.y, photoGlow.position.z);
                sparkles.emit(binding.localToWorld(mote), 1, .1, null, .6);
            }
        } else hoverGlow = 0;
        photoShine.visible = photoGlow.visible && hoverGlow > .01;
        if (opening) {
            const t = cap((now-opening.start)/Math.max(1,opening.duration),0,1);
            openness = mix(opening.from,opening.to,t);
            if (t >= 1) opening = null;
            bindCover();
        }
        if (turning && !turning.held) {
            const t = cap((now-turning.start)/turning.duration,0,1);
            const ease = turning.spring ? 1-Math.exp(-5.6*t)*(Math.cos(6.4*t)+.35*Math.sin(6.4*t)) : curve(t);
            setTurnProgress(mix(turning.from,turning.to,ease));
            if (t >= 1) finishTurn(turning.to === 1);
        }
        if (!drag) {
            wantedX += speedX*dt;
            wantedY += speedY*dt;
            const friction = Math.exp(-6.8*dt);
            speedX *= friction;
            speedY *= friction;
            if (Math.abs(speedX)+Math.abs(speedY) < .008) speedX = speedY = 0;
        }
        wantedX = cap(wantedX,openTarget ? -.48 : -.88, openTarget ? .48 : .88);
        wantedY = cap(wantedY,openTarget ? -.30 : -.46, openTarget ? .30 : .48);
        const response = reduced.matches ? 1 : 1-Math.exp(-(drag ? 24 : 15)*dt);
        orbitX = mix(orbitX,wantedX,response);
        orbitY = mix(orbitY,wantedY,response);
        const moving = Math.abs(orbitX-wantedX)+Math.abs(orbitY-wantedY) > .0005 || !!(speedX || speedY);
        const staging = popup.update(dt);
        placeCamera();
        // The book flies in from the dark, spinning, then floats in place.
        if (arrival < 1) arrival = Math.min(1, arrival + Math.min(dt, 1 / 30) / 3.4);
        const flight = 1 - Math.pow(1 - arrival, 3);
        const far = 1 - flight;
        const calm = 1 - .75 * curve(cap(focus.amount, 0, 1));
        model.position.copy(axes).multiplyScalar(-42 * far);
        model.position.z += (Math.sin(clock * 1.15) * .055 + .04) * calm + 2.2 * Math.sin(far * Math.PI);
        model.position.y += Math.sin(clock * .7 + 1) * .03 * calm;
        model.rotation.set(Math.sin(clock * .83) * .022 * calm + far * 1.2, Math.sin(clock * .61 + .5) * .03 * calm, far * Math.PI * 1.6);
        model.updateMatrixWorld(true);
        // Shadows only exist once the book has landed, then deepen with the seal.
        ground.material.opacity *= sealGlow;
        rightShadow.material.opacity *= sealGlow;
        leftShadow.material.opacity *= sealGlow;
        ground.visible = rightShadow.visible = leftShadow.visible = arrived;
        if (far > .01) {
            for (let i = 0; i < 7; i++) {
                mote.set(Math.random() * 3.2, (Math.random() - .5) * 2, .2);
                sparkles.emit(model.localToWorld(mote), 1, .35, null, .3);
            }
        } else if (!arrived) {
            arrived = true;
            flashAt = clock; flashPower = 1.8;
            for (let i = 0; i < 48; i++) {
                const a = i / 48 * Math.PI * 2;
                mote.set(1.63 + Math.cos(a) * 2.2, Math.sin(a) * 1.5, 0);
                sparkles.emit(mote, 2, .25, null, 1.4);
            }
        }
        if (arrived) sealGlow = Math.min(1, sealGlow + dt / 1.8);
        magicCircle.visible = sealGlow > 0;
        magicCircle.position.x = mix(1.63, 0, openness);
        magicCircle.rotation.z = clock * .03;
        magicCircle.scale.setScalar(.8 + .2 * (1 - Math.pow(1 - sealGlow, 3)));
        magicCircle.material.opacity = sealGlow * sealGlow * (.2 + .05 * Math.sin(clock * 1.4)) * (1 - .55 * curve(cap(focus.amount, 0, 1)));
        const sparkling = sparkles.update(dt, clock);
        if (width && height) {
            const depth = curve(cap(focus.amount,0,1));
            bokeh.enabled = depth > .04 && !reduced.matches;
            if (bokeh.enabled) {
                bokeh.uniforms.focus.value = camera.position.distanceTo(focusPoint);
                bokeh.uniforms.aperture.value = .0075*depth;
            }
            grade.uniforms.uTime.value = clock;
            const since = clock - flashAt;
            bloom.strength = .5 + (since >= 0 && since < 1.1 ? flashPower * (1 - since / 1.1) ** 2 : 0);
            composer.render(dt);
        }
        invalidate();
    }

    function resize() {
        const bounds = host.getBoundingClientRect();
        width = Math.max(1, Math.round(bounds.width));
        height = Math.max(1, Math.round(bounds.height));
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(width,height,false);
        composer.setPixelRatio(renderer.getPixelRatio());
        composer.setSize(width,height);
        camera.aspect = width/height;
        camera.updateProjectionMatrix();
        sparkles.setScale(height*renderer.getPixelRatio()/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2))*.01);
        placeCamera();
        invalidate();
    }

    function pointerRay(e) {
        const box = canvas.getBoundingClientRect();
        if (!box.width || !box.height) return;
        pointerNDC.set((e.clientX-box.left)/box.width*2-1,1-(e.clientY-box.top)/box.height*2);
        ray.setFromCamera(pointerNDC,camera);
    }

    function bookHit(e) {
        pointerRay(e);
        return ray.intersectObject(model,true).some(hit => hit.object.visible && hit.object.parent.visible);
    }

    function photoHit(e) {
        if (!spread?.hasPhoto || openness < .90 || !openTarget || turning) return false;
        pointerRay(e);
        const hit = ray.intersectObject(right,false)[0];
        if (!hit?.uv) return false;
        const {u,v,w,h} = spread.box;
        return hit.uv.x >= u && hit.uv.x <= u+w && hit.uv.y >= v && hit.uv.y <= v+h;
    }

    function pageHit(e) {
        if (!openTarget || openness < .96 || turning) return null;
        pointerRay(e);
        const hit = ray.intersectObjects([left,right],false)[0];
        if (!hit?.uv) return null;
        const direction = hit.object === right ? 1 : -1;
        return { direction, edge: true, v:hit.uv.y };
    }

    function pullAxis(hit) {
        const box = canvas.getBoundingClientRect();
        const page = hit.direction > 0 ? right : left, other = hit.direction > 0 ? left : right;
        const rim = new THREE.Vector3();
        pointOnSheet(page.geometry,1,hit.v,rim).applyMatrix4(page.matrixWorld).project(camera);
        pointOnSheet(other.geometry,1,hit.v,sample).applyMatrix4(other.matrixWorld).project(camera);
        const x = (sample.x-rim.x)*box.width*.5, y = (rim.y-sample.y)*box.height*.5;
        const length = Math.max(24,Math.hypot(x,y));
        return { x:x/length, y:y/length, distance:length*.72 };
    }

    function releasePointer() {
        const released = drag;
        drag = null;
        if (released && canvas.hasPointerCapture?.(released.id)) canvas.releasePointerCapture(released.id);
        canvas.style.cursor = 'default';
    }

    // Any press on a page with a neighbour picks up that leaf; travel toward
    // the spine carries it over, a plain touch turns it or opens the picture.
    // Pointer position only sways the book a little, after 3D Animation/5's
    // damped rig (Rig.jsx), so the album feels held rather than spun.
    function press(e) {
        lastInput = performance.now();
        if (peek) { peek = null; finishTurn(false); }
        if (!active || disposed || drag || !e.isPrimary || e.button !== 0 || !arrived) return;
        if (sceneOn) {
            drag = { id:e.pointerId, sx:e.clientX, sy:e.clientY, max:0, kind:'scene' };
            return;
        }
        if (!bookHit(e)) return;
        const hit = pageHit(e);
        const adjacent = hit ? callbacks.neighbor?.(hit.direction) : null;
        const now = performance.now();
        drag = { id:e.pointerId, sx:e.clientX, sy:e.clientY, max:0, moved:false, kind: adjacent ? 'page' : 'click' };
        if (adjacent) {
            Object.assign(drag, { direction: hit.direction, next: adjacent, axis: pullAxis(hit),
                corner: cap(1-2*hit.v,-1,1), lastX: e.clientX, lastY: e.clientY, lastT: now, speed: 0 });
        }
        canvas.setPointerCapture?.(e.pointerId);
    }

    function sway(e) {
        const box = canvas.getBoundingClientRect();
        if (!box.width || reduced.matches) return;
        const px = cap((e.clientX-box.left)/box.width,0,1)-.5, py = cap((e.clientY-box.top)/box.height,0,1)-.5;
        wantedX = px*(sceneOn ? .2 : .08);
        wantedY = -py*(sceneOn ? .1 : .05);
        invalidate();
    }

    function move(e) {
        if (!active || disposed) return;
        if (e.pointerType !== 'touch') sway(e);
        if (!drag) {
            if (e.pointerType !== 'touch') {
                const hit = sceneOn ? null : pageHit(e);
                hoverPhoto = !sceneOn && photoHit(e);
                canvas.style.cursor = sceneOn ? 'pointer'
                    : hoverPhoto ? 'pointer'
                    : spread?.day?.blank && hit?.direction === 1 ? 'pointer'
                    : hit && callbacks.neighbor?.(hit.direction) ? 'grab'
                    : !openTarget && bookHit(e) ? 'pointer' : 'default';
            }
            return;
        }
        if (drag.id !== e.pointerId) return;
        const dx = e.clientX-drag.sx, dy = e.clientY-drag.sy;
        drag.max = Math.max(drag.max,Math.hypot(dx,dy));
        const threshold = e.pointerType === 'touch' ? 10 : 5;
        if (drag.max <= threshold && !drag.moved) return;
        drag.moved = true;
        if (drag.kind !== 'page') return;
        canvas.style.cursor = 'grabbing';
        const now = performance.now();
        const towardSpine = dx*drag.axis.x + dy*drag.axis.y;
        const step = ((e.clientX-drag.lastX)*drag.axis.x + (e.clientY-drag.lastY)*drag.axis.y)/Math.max(8,now-drag.lastT);
        drag.speed = mix(drag.speed, step, .5);
        drag.lastX = e.clientX; drag.lastY = e.clientY; drag.lastT = now;
        if (!turning && towardSpine > 1) beginTurn(drag.direction,drag.next,true,true,drag.corner);
        if (turning?.held) setTurnProgress(towardSpine/drag.axis.distance);
        e.preventDefault();
    }

    function release(e) {
        if (!drag || e.pointerId !== drag.id) return;
        const gesture = drag;
        const movement = Math.max(gesture.max, Math.hypot(e.clientX-gesture.sx,e.clientY-gesture.sy));
        const clicked = e.type === 'pointerup' && movement <= (e.pointerType === 'touch' ? 10 : 6);
        releasePointer();
        if (gesture.kind === 'scene') {
            if (clicked) callbacks.onLeaveScene?.();
            return;
        }
        if (gesture.kind === 'page' && turning?.held) {
            const travel = (e.clientX-gesture.sx)*gesture.axis.x+(e.clientY-gesture.sy)*gesture.axis.y;
            setTurnProgress(travel/gesture.axis.distance);
            letGo(e.type === 'pointerup' && (turning.progress >= .3 || (turning.progress > .06 && gesture.speed > .35)));
            return;
        }
        if (!clicked || !active || turning) return;
        if (!openTarget) {
            if (openness < .07 && bookHit(e)) callbacks.onOpen?.();
            return;
        }
        if (photoHit(e)) return callbacks.onEnter?.();
        const hit = pageHit(e);
        if (spread?.day?.blank && hit?.direction === 1) return callbacks.onBlank?.();
        if (hit && gesture.next) beginTurn(hit.direction,gesture.next,true,false,gesture.corner);
        invalidate();
    }

    function enterScene() {
        if (peek) { peek = null; finishTurn(false); }
        hoverPhoto = false;
        if (sceneOn || disposed || !spread?.hasPhoto || !spread.image || !openTarget || turning || openness < .96) return false;
        const box = spread.box;
        const near = pointOnSheet(right.geometry, box.u, box.v+box.h, new THREE.Vector3());
        const far = pointOnSheet(right.geometry, box.u+box.w, box.v, new THREE.Vector3());
        const W = Math.abs(far.x-near.x), H = Math.abs(far.y-near.y);
        stageFrame = { W, H, origin: new THREE.Vector3((near.x+far.x)/2, Math.min(near.y,far.y), Math.max(near.z,far.z)) };
        sceneOn = true;
        canvas.style.cursor = 'pointer';
        spread.showPrint(false);
        const length = popup.play(spread.day, spread.image, { W, H, origin: stageFrame.origin, lift: .006 });
        Object.assign(focus, { from: focus.amount, to: 1, start: performance.now(), duration: reduced.matches ? 1 : 1700 });
        invalidate();
        return length;
    }

    async function leaveScene() {
        if (!sceneOn) return;
        Object.assign(focus, { from: focus.amount, to: 0, start: performance.now()+350, duration: reduced.matches ? 1 : 1500 });
        invalidate();
        await popup.fold();
        spread?.showPrint(true);
        sceneOn = false;
        invalidate();
    }

    function settleMotion() {
        if (opening) {
            openness = opening.to;
            opening = null;
            bindCover();
        }
        if (turning) finishTurn(!turning.held && turning.to === 1);
        speedX = speedY = 0;
        lastFrame = null;
    }

    function setActive(value) {
        if (disposed || active === !!value) return;
        active = !!value;
        if (!active) {
            settleMotion();
            releasePointer();
            cancelAnimationFrame(frameId);
            frameId = 0;
        } else {
            resize();
            invalidate();
        }
    }

    function photoBounds() {
        if (disposed || !openTarget || openness < .88 || !spread?.hasPhoto || turning) return null;
        const bounds = canvas.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return null;
        const box = spread.box;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        right.updateWorldMatrix(true,false);
        for (const u of [box.u,box.u+box.w*.5,box.u+box.w]) {
            for (const v of [box.v,box.v+box.h*.5,box.v+box.h]) {
                pointOnSheet(right.geometry,u,v,sample).applyMatrix4(right.matrixWorld).project(camera);
                const x = bounds.left+(sample.x+1)*.5*bounds.width;
                const y = bounds.top+(1-sample.y)*.5*bounds.height;
                x0 = Math.min(x0,x); x1 = Math.max(x1,x);
                y0 = Math.min(y0,y); y1 = Math.max(y1,y);
            }
        }
        return new DOMRect(x0,y0,x1-x0,y1-y0);
    }

    function bookBounds() {
        if (disposed || !Number.isFinite(occupied.left)) return null;
        const box = canvas.getBoundingClientRect();
        return new DOMRect(box.left+occupied.left*box.width,box.top+occupied.top*box.height,
            (occupied.right-occupied.left)*box.width,(occupied.bottom-occupied.top)*box.height);
    }

    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(host);
    canvas.addEventListener('pointerleave', () => { hoverPhoto = false; }, { signal: listeners.signal });
    for (const [name, handler] of [['pointerdown',press],['pointermove',move],['pointerup',release],
        ['pointercancel',release],['lostpointercapture',release]]) {
        canvas.addEventListener(name,handler,{ signal: listeners.signal });
    }
    function changeMotion() {
        if (reduced.matches) {
            settleMotion();
            orbitX = wantedX;
            orbitY = wantedY;
        }
        invalidate();
    }
    function visibility() {
        if (document.hidden) {
            settleMotion();
            releasePointer();
            cancelAnimationFrame(frameId);
            frameId = 0;
        } else invalidate();
    }
    reduced.addEventListener('change',changeMotion);
    document.addEventListener('visibilitychange',visibility,{ signal:listeners.signal });
    window.addEventListener('resize',resize,{ signal:listeners.signal });
    bindCover();
    resize();


    function dispose() {
        if (disposed) return;
        disposed = true;
        active = false;
        finishTurn(false);
        releasePointer();
        cancelAnimationFrame(frameId);
        listeners.abort();
        removeLossListener();
        reduced.removeEventListener('change',changeMotion);
        sizeObserver.disconnect();
        popup.dispose();
        sparkles.dispose();
        showSpread(null);
        spread?.dispose();
        scene.environment.dispose();
        disposeTree(scene);
        key.shadow.dispose();
        renderer.dispose();
        canvas.remove();
    }
    return { setState, turn, setActive, photoBounds, bookBounds, dispose, enterScene, leaveScene,
        get sceneActive() { return sceneOn; } };
}

export async function createBookView(host, { onOpen, onEnter, onUnavailable, neighbor, onTurn, onBlank, onLeaveScene } = {}) {
    let renderer, view, model, failed = false;
    function unavailable(error) {
        if (failed) return;
        failed = true;
        if (view) view.dispose();
        else {
            renderer?.domElement.removeEventListener('webglcontextlost',lost);
            renderer?.dispose();
            renderer?.domElement.remove();
        }
        onUnavailable?.(error);
    }
    function lost(event) {
        event.preventDefault();
        unavailable(new Error('The book’s graphics context was lost.'));
    }
    try {
        renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:'high-performance' });
        renderer.setClearColor(0x000000,1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        const canvas = renderer.domElement;
        canvas.className = 'physical-book-canvas';
        canvas.setAttribute('aria-hidden','true');
        Object.assign(canvas.style,{ display:'block', width:'100%', height:'100%', touchAction:'none', cursor:'grab' });
        host.appendChild(canvas);
        canvas.addEventListener('webglcontextlost',lost);
        const bytes = Uint8Array.from(atob(bookData), c => c.charCodeAt(0));
        model = (await new GLTFLoader().parseAsync(bytes.buffer, '')).scene;
        await Promise.race([
            Promise.all(['600 40px "Cinzel"', '700 40px "Cinzel Decorative"', '40px "IM Fell English"', 'italic 40px "IM Fell English"']
                .map(face => document.fonts.load(face))).catch(() => {}),
            new Promise(done => setTimeout(done, 3000))
        ]);
        if (failed) {
            disposeTree(model);
            return null;
        }
        view = setUpBook(renderer,model,host,{onOpen,onEnter,neighbor,onTurn,onBlank,onLeaveScene},
            () => canvas.removeEventListener('webglcontextlost',lost));
        return view;
    } catch (error) {
        console.error('Book setup failed:', error);
        disposeTree(model);
        unavailable(error);
        return null;
    }
}
