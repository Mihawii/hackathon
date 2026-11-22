// The pop-up theatre. When a reader touches the photograph, the print peels
// off the page and stands up as a backdrop, paper flats unfold in front of it,
// and two paper players step out of the picture to act the day out.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { paperCast, handPoint, ticket, umbrella, lantern, note, bird, fiddle } from './paper-player-art.js';

const TAU = Math.PI * 2;
const STAND = Math.PI / 2;

// Each mood keeps the same staging grammar (backdrop, far flat, players,
// near flat) and changes the paper, the ritual and the weather.
const PALETTES = {
    gold: { far: '#7d9474', mid: '#6d8668', near: '#4f6f63', water: '#5c8792', glow: '#f3c66c', cast: 'lake', accent: '#c99651' },
    rain: { far: '#566c7e', mid: '#4b5f70', near: '#3c4d5a', water: '#5b7487', glow: '#f6c56b', cast: 'rain', accent: '#d6a450' },
    bloom: { far: '#93b062', mid: '#7f9c50', near: '#668a43', water: '#c8452f', glow: '#f2b552', cast: 'meadow', accent: '#dec17a' }
};

function sheet(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

function random(seed) {
    let s = seed >>> 0 || 1;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function texture(canvas) {
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
}

function cardMaterial(map) {
    return new THREE.MeshStandardMaterial({ map, alphaTest: .45, side: THREE.DoubleSide, roughness: .9, metalness: 0 });
}

function paintBackdrop(image, tint) {
    const ratio = image.naturalWidth / image.naturalHeight || 1.6;
    const w = 1024, h = Math.round(w / ratio), border = 18;
    const c = sheet(w + border * 2, h + border * 2), ctx = c.getContext('2d');
    ctx.fillStyle = '#f3e7cf';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(image, border, border, w, h);
    // A warm wash ties the print to the paper players in front of it.
    ctx.fillStyle = tint;
    ctx.globalAlpha = .12;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(border, border, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const v = ctx.createRadialGradient(c.width / 2, c.height / 2, h * .3, c.width / 2, c.height / 2, w * .62);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(32,20,10,.32)');
    ctx.fillStyle = v;
    ctx.fillRect(border, border, w, h);
    ctx.strokeStyle = '#cdb994';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, c.width - 3, c.height - 3);
    return c;
}

function paintPhotoLayer(image, from, mood, pal, seed, near) {
    const iw = image.naturalWidth, ih = image.naturalHeight;
    const w = 1024, h = Math.round(w * (ih * (1 - from)) / iw);
    const c = sheet(w, h), ctx = c.getContext('2d');
    const roll = random(seed);
    const lip = h * (near ? .34 : .26);
    const edge = [];
    for (let x = 0; x <= w; x += 6) {
        const wave = Math.sin(x / w * Math.PI * (near ? 5 : 3) + seed) * lip * .35 + Math.sin(x / w * Math.PI * 13 + seed * 3) * lip * .12;
        edge.push([x, lip * .55 + wave + (roll() - .5) * 7]);
    }
    const trace = g => {
        g.moveTo(0, h);
        g.lineTo(0, edge[0][1]);
        for (const [x, y] of edge) g.lineTo(x, y);
        g.lineTo(w, h);
        g.closePath();
    };
    ctx.save();
    ctx.beginPath();
    trace(ctx);
    ctx.clip();
    ctx.filter = near ? 'brightness(.78) saturate(1.18) contrast(1.08)' : 'brightness(.96) saturate(1.05)';
    ctx.drawImage(image, 0, ih * from, iw, ih * (1 - from), 0, 0, w, h);
    ctx.filter = 'none';
    // Depth haze on the far layer, a warm dusk on the near one.
    const wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, near ? 'rgba(40,24,10,.0)' : 'rgba(255,236,200,.16)');
    wash.addColorStop(1, near ? 'rgba(25,14,6,.38)' : 'rgba(40,30,20,.10)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    // The torn edge shows the white core of the card stock.
    ctx.save();
    ctx.beginPath();
    for (const [i, [x, y]] of edge.entries()) i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    ctx.strokeStyle = 'rgba(20,12,6,.45)';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#f7eedb';
    ctx.lineWidth = 4.5;
    ctx.stroke();
    ctx.restore();
    if (near) accents(ctx, mood, pal, edge, w, h, roll);
    return c;
}

function accents(ctx, mood, pal, edge, w, h, roll) {
    const at = x => edge[Math.min(edge.length - 1, Math.max(0, Math.round(x / 6)))][1];
    if (mood === 'gold') {
        for (let i = 0; i < 34; i++) {
            const x = (i < 17 ? roll() * .22 : .78 + roll() * .22) * w, y = at(x) + 4, len = 50 + roll() * 110, bend = (roll() - .5) * 30;
            ctx.strokeStyle = '#2a2116';
            ctx.lineWidth = 2.6;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + bend * .3, y - len * .6, x + bend, y - len); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,205,120,.55)';
            ctx.lineWidth = 1;
            ctx.stroke();
            if (roll() < .5) {
                ctx.fillStyle = '#5a3d22';
                ctx.beginPath(); ctx.ellipse(x + bend, y - len, 4.5, 13, bend / 70, 0, TAU); ctx.fill();
            }
        }
    } else if (mood === 'bloom') {
        for (let i = 0; i < 16; i++) {
            const x = roll() * w, y = at(x) - 6 - roll() * 30, r = 9 + roll() * 9;
            ctx.strokeStyle = '#2f4521'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x, at(x) + 10); ctx.quadraticCurveTo(x - 6, y + 20, x, y); ctx.stroke();
            ctx.fillStyle = i % 4 ? '#d2412c' : '#e9b44c';
            for (let p = 0; p < 4; p++) {
                ctx.beginPath(); ctx.ellipse(x + Math.cos(p * 1.57 + .4) * r * .55, y + Math.sin(p * 1.57 + .4) * r * .45, r * .72, r * .55, p, 0, TAU); ctx.fill();
            }
            ctx.fillStyle = '#1e120d';
            ctx.beginPath(); ctx.arc(x, y, r * .3, 0, TAU); ctx.fill();
        }
    } else {
        ctx.fillStyle = 'rgba(210,228,240,.5)';
        for (let i = 0; i < 70; i++) {
            const x = roll() * w, y = at(x) + 10 + roll() * (h - at(x) - 10);
            ctx.beginPath(); ctx.ellipse(x, y, 1.6 + roll() * 2.4, 3 + roll() * 4, 0, 0, TAU); ctx.fill();
        }
    }
}

function makeFlat(canvas, width, height) {
    const map = texture(canvas);
    const geometry = new THREE.PlaneGeometry(width, height).translate(0, height / 2, 0);
    const mesh = new THREE.Mesh(geometry, cardMaterial(map));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = false;
    return mesh;
}

function makePuppet(draw, height) {
    const W = 320, H = 400;
    const canvas = sheet(W, H), ctx = canvas.getContext('2d');
    const map = texture(canvas);
    const geometry = new THREE.PlaneGeometry(height * W / H, height).translate(0, height / 2, 0);
    const mesh = new THREE.Mesh(geometry, cardMaterial(map));
    mesh.castShadow = true;
    mesh.rotation.x = STAND;
    mesh.visible = false;
    const pose = { x: 160, y: 382, dir: 1, scale: 1.42, fold: 1, lean: 0, walk: 0, phase: 0, sit: 0, nod: 0, ears: 0, handX: 11, handY: -37 };
    const props = {};
    const figure = sheet(W, H), fctx = figure.getContext('2d');
    const card = sheet(W, H), cctx = card.getContext('2d');
    const ring = [[4, 0], [-4, 0], [0, 4], [0, -4], [3, 3], [-3, 3], [3, -3], [-3, -3]];
    return {
        mesh, pose, props,
        render(paintProps) {
            fctx.clearRect(0, 0, W, H);
            draw(fctx, pose);
            paintProps?.(fctx, pose, props);
            cctx.globalCompositeOperation = 'source-over';
            cctx.clearRect(0, 0, W, H);
            cctx.drawImage(figure, 0, 0);
            cctx.globalCompositeOperation = 'source-in';
            cctx.fillStyle = '#f8f0de';
            cctx.fillRect(0, 0, W, H);
            ctx.clearRect(0, 0, W, H);
            for (const [dx, dy] of ring) ctx.drawImage(card, dx, dy);
            ctx.drawImage(figure, 0, 0);
            map.needsUpdate = true;
        }
    };
}

function spriteFrom(paint, size = 128) {
    const c = sheet(size, size), ctx = c.getContext('2d');
    paint(ctx, size);
    const map = texture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
    return sprite;
}

export function createPopupTheatre({ parent, sparkles, invalidate, flash = () => {} }) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let stage = null;

    function build(day, image, frame) {
        const mood = PALETTES[day.mood] ? day.mood : 'gold';
        const pal = PALETTES[mood];
        const tint = typeof day.tint === 'string' ? day.tint : '#bd9e65';
        const { W, H, origin, lift } = frame;
        const group = new THREE.Group();
        group.position.copy(origin);
        parent.add(group);

        const backdropCanvas = paintBackdrop(image, tint);
        const backdrop = makeFlat(backdropCanvas, W * 1.03, H * 1.03);
        backdrop.material.emissive = new THREE.Color(0xffffff);
        backdrop.material.emissiveMap = backdrop.material.map;
        backdrop.material.emissiveIntensity = .42;
        backdrop.visible = true;
        backdrop.position.set(0, 0, lift);
        group.add(backdrop);

        // Two bands of the photograph, cut and stood in front of it.
        const far = makeFlat(paintPhotoLayer(image, .46, mood, pal, 7, false), W * 1.04, H * .54 * 1.04);
        far.position.set(0, H * .66, lift);
        const near = makeFlat(paintPhotoLayer(image, .7, mood, pal, 19, true), W * 1.1, H * .3 * 1.1);
        near.position.set(0, H * .14, lift);
        group.add(far, near);

        const cast = paperCast(document, pal.cast, pal.accent);
        const tall = H * .9;
        const fox = makePuppet(cast.fox, tall);
        const hare = makePuppet(cast.hare, tall * .94);
        fox.pose.dir = 1;
        hare.pose.dir = -1;
        group.add(fox.mesh, hare.mesh);

        const state = { mood, pal, W, H, group, backdrop, far, near, fox, hare, cast, extras: [], timeline: null, clock: 0, leaving: false, weather: null };
        stage = state;

        if (mood === 'gold') {
            const boatCanvas = sheet(256, 160), bctx = boatCanvas.getContext('2d');
            const boat = makeFlat(boatCanvas, H * .26, H * .26 * 160 / 256);
            boat.material.map.needsUpdate = true;
            boat.rotation.x = STAND;
            boat.userData = { canvas: boatCanvas, ctx: bctx, fold: 1, bob: 0 };
            group.add(boat);
            state.boat = boat;
        }
        if (mood === 'rain') {
            const count = 260, positions = new Float32Array(count * 6);
            const drops = Array.from({ length: count }, () => ({ x: (Math.random() - .5) * W * 1.1, y: Math.random() * H, z: Math.random() * H * 1.3, v: 1.6 + Math.random() * .9 }));
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xc9dbe6, transparent: true, opacity: 0, depthWrite: false }));
            rain.frustumCulled = false;
            group.add(rain);
            state.weather = { rain, drops, positions, strength: 0 };
        }
        if (mood === 'bloom') {
            const notes = Array.from({ length: 9 }, (_, i) => {
                const sprite = spriteFrom((ctx, s) => {
                    ctx.translate(s / 2, s / 2);
                    note(ctx, 0, 0, s / 30, (i % 3 - 1) * .3, i % 2 === 0);
                });
                sprite.scale.setScalar(H * .1);
                sprite.visible = false;
                sprite.userData = { life: 0, x: 0, y: 0, z: 0, sway: Math.random() * TAU };
                group.add(sprite);
                return sprite;
            });
            const birdCanvas = sheet(160, 120), birdCtx = birdCanvas.getContext('2d');
            const flyer = makeFlat(birdCanvas, H * .16, H * .12);
            flyer.rotation.x = STAND;
            flyer.userData = { canvas: birdCanvas, ctx: birdCtx, t: -1 };
            group.add(flyer);
            state.notes = notes;
            state.bird = flyer;
        }
        return state;
    }

    function burst(state, x, y, z, count = 40, spread = .5, color) {
        const p = state.group.localToWorld(new THREE.Vector3(x, y, z));
        sparkles.emit(p, count, spread * state.H, color);
    }

    function walkTo(tl, puppet, at, x, y, duration) {
        tl.to(puppet.mesh.position, { x, y, duration, ease: 'sine.inOut',
            onStart() {
                puppet.pose.walk = 1;
                puppet.pose.dir = x >= puppet.mesh.position.x ? 1 : -1;
            },
            onComplete() { puppet.pose.walk = 0; } }, at);
    }

    function stepOut(tl, state, puppet, at, x, y) {
        const { H } = state;
        const m = puppet.mesh;
        tl.call(() => {
            m.visible = true;
            m.position.set(x * .4, H * .96, H * .3);
            m.scale.setScalar(.3);
            puppet.pose.walk = 1;
            burst(state, x * .4, H * .94, H * .45, 34, .25);
        }, null, at);
        tl.to(m.position, { x, y, duration: 1.25, ease: 'power2.out' }, at);
        tl.to(m.position, { keyframes: [{ z: H * .42, duration: .5, ease: 'sine.out' }, { z: 0, duration: .75, ease: 'bounce.out' }] }, at);
        tl.to(m.scale, { x: 1, y: 1, z: 1, duration: 1.05, ease: 'back.out(1.6)' }, at);
        tl.fromTo(m.rotation, { y: -TAU * 1.5 }, { y: 0, duration: 1.15, ease: 'power3.out' }, at);
        for (let i = 0; i < 16; i++) {
            tl.call(() => {
                const a = i * .8, r = H * (.22 - i * .011);
                burst(state, m.position.x + Math.cos(a) * r, m.position.y + Math.sin(a) * r * .4, m.position.z + i * H * .03, 2, .05);
            }, null, at + i * .06);
        }
        tl.call(() => { flash(.7); puppet.pose.walk = 0; }, null, at + 1.25);
    }

    function goldRitual(tl, state, t) {
        const { fox, hare, H, W, boat } = state;
        hare.props.ticket = 0;
        tl.to(hare.pose, { handX: 18, handY: -64, duration: .7, ease: 'sine.inOut' }, t);
        tl.call(() => { hare.props.holding = true; }, null, t);
        tl.to(hare.props, { ticket: 1, duration: 2.2, ease: 'power1.inOut' }, t + .7);
        tl.to(fox.pose, { nod: .18, duration: .4, yoyo: true, repeat: 3 }, t + .8);
        tl.to(hare.pose, { sit: .55, handX: 22, handY: -16, duration: .9, ease: 'sine.inOut' }, t + 3.1);
        tl.call(() => {
            hare.props.holding = false;
            boat.visible = true;
            boat.position.set(hare.mesh.position.x + W * .06, H * .26, 0);
            burst(state, boat.position.x, H * .26, H * .05, 30, .2);
        }, null, t + 3.9);
        tl.to(hare.pose, { sit: 0, handX: 11, handY: -37, duration: .8 }, t + 4.2);
        tl.to(boat.position, { x: W * .42, duration: 9, ease: 'none' }, t + 4.1);
        walkTo(tl, fox, t + 4.6, W * .02, H * .4, 2.2);
        walkTo(tl, hare, t + 4.9, W * .18, H * .4, 2.6);
        tl.call(() => { fox.pose.dir = 1; hare.pose.dir = 1; }, null, t + 7.6);
        tl.to(fox.pose, { handX: 26, handY: -50, duration: .6 }, t + 8);
    }

    function rainRitual(tl, state, t) {
        const { fox, hare, W, H } = state;
        tl.to(state.weather, { strength: 1, duration: 2.5 }, t - 1);
        fox.props.umbrella = 0;
        hare.props.lantern = 0;
        tl.to(fox.pose, { handX: 16, handY: -66, duration: .6 }, t);
        tl.to(fox.props, { umbrella: 1, duration: 1.1, ease: 'back.out(1.7)' }, t + .4);
        walkTo(tl, hare, t + 1.4, W * .04, H * .4, 1.6);
        walkTo(tl, fox, t + 1.5, -W * .1, H * .42, 1.4);
        tl.call(() => { fox.pose.dir = 1; hare.pose.dir = -1; }, null, t + 3.2);
        tl.to(hare.pose, { handX: 20, handY: -48, duration: .6 }, t + 3.4);
        tl.to(hare.props, { lantern: 1, duration: 1.6, ease: 'sine.in' }, t + 3.8);
        tl.call(() => burst(state, W * .06, H * .4, H * .32, 26, .14, 0xffd27a), null, t + 4.6);
        tl.to(hare.pose, { ears: 1, duration: .5, yoyo: true, repeat: 5 }, t + 5.2);
        tl.to(fox.pose, { lean: -.06, duration: 1.2, yoyo: true, repeat: 5, ease: 'sine.inOut' }, t + 5);
    }

    function bloomRitual(tl, state, t) {
        const { fox, hare, W, H } = state;
        hare.props.fiddle = false;
        tl.call(() => { hare.props.fiddle = true; state.music = true; }, null, t);
        tl.to(hare.pose, { handX: 20, handY: -55, duration: .5 }, t);
        tl.to(fox.pose, { keyframes: [{ lean: .1, duration: .45 }, { lean: -.1, duration: .45 }], repeat: 9, yoyo: true, ease: 'sine.inOut' }, t + .6);
        walkTo(tl, fox, t + 1.2, -W * .26, H * .44, 1.4);
        walkTo(tl, fox, t + 2.9, -W * .04, H * .44, 1.4);
        tl.call(() => { state.bird.userData.t = 0; state.bird.visible = true; }, null, t + 2);
        walkTo(tl, hare, t + 5.5, W * .1, H * .42, 1.8);
        walkTo(tl, fox, t + 5.6, -W * .14, H * .42, 1.6);
        tl.call(() => { fox.pose.dir = 1; hare.pose.dir = -1; }, null, t + 7.6);
    }

    function play(day, image, frame) {
        dispose();
        const state = build(day, image, frame);
        const { W, H, backdrop, far, near, fox, hare } = state;
        const tl = gsap.timeline({ paused: false });
        state.timeline = tl;
        const speed = reduced.matches ? 6 : 1;
        tl.timeScale(speed);
        // The print peels from the page: its foot slides to the back of the
        // slot while it stands up on its lower edge.
        // The print gathers light, gold dust circles it, then it springs up.
        tl.to(backdrop.material, { emissiveIntensity: 1.5, duration: .55, ease: 'power2.in' }, 0);
        for (let i = 0; i < 18; i++) {
            const a = i / 18 * TAU;
            tl.call(() => burst(state, Math.cos(a) * W * .52, H * .5 + Math.sin(a) * H * .56, H * .03, 4, .06), null, i * .028);
        }
        tl.to(backdrop.position, { z: frame.lift + H * .05, duration: .5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0);
        tl.call(() => { flash(1.6); burst(state, 0, H * .5, H * .1, 170, 1.1); }, null, .55);
        tl.to(backdrop.material, { emissiveIntensity: .42, duration: 1.2, ease: 'power2.out' }, .6);
        tl.to(backdrop.position, { y: H * .98, z: frame.lift + .002, duration: 1.1, ease: 'power3.out' }, .55);
        tl.to(backdrop.rotation, { x: STAND, duration: 1.15, ease: 'back.out(1.7)' }, .55);
        // Each flat snaps open and sheds dust along its torn top edge.
        const trail = (y, top) => () => {
            for (let i = 0; i <= 14; i++) burst(state, (i / 14 - .5) * W, y, top, 3, .08);
            flash(.5);
        };
        tl.call(() => { far.visible = true; }, null, 1.05);
        tl.fromTo(far.rotation, { x: 0 }, { x: STAND, duration: .95, ease: 'elastic.out(1.1,.45)' }, 1.05);
        tl.fromTo(far.scale, { x: .6 }, { x: 1, duration: .7, ease: 'back.out(2)' }, 1.05);
        tl.call(trail(H * .66, H * .5), null, 1.3);
        tl.call(() => { near.visible = true; }, null, 1.4);
        tl.fromTo(near.rotation, { x: 0 }, { x: STAND, duration: .95, ease: 'elastic.out(1.1,.45)' }, 1.4);
        tl.fromTo(near.scale, { x: .6 }, { x: 1, duration: .7, ease: 'back.out(2)' }, 1.4);
        tl.call(trail(H * .14, H * .3), null, 1.65);
        stepOut(tl, state, fox, 2.2, -W * .2, H * .44);
        stepOut(tl, state, hare, 2.75, W * .2, H * .4);
        tl.call(() => { fox.pose.dir = 1; hare.pose.dir = -1; }, null, 4.1);
        if (state.mood === 'gold') goldRitual(tl, state, 4.4);
        else if (state.mood === 'rain') rainRitual(tl, state, 4.4);
        else bloomRitual(tl, state, 4.4);
        invalidate();
        return tl.duration() / speed;
    }

    function fold() {
        const state = stage;
        if (!state || state.leaving) return Promise.resolve();
        state.leaving = true;
        state.timeline?.kill();
        const { H, backdrop, far, near, fox, hare } = state;
        const quick = reduced.matches;
        return new Promise(resolve => {
            const tl = gsap.timeline({ onComplete: () => { dispose(); resolve(); } });
            state.timeline = tl;
            for (const [i, puppet] of [fox, hare].entries()) {
                if (!puppet.mesh.visible) continue;
                puppet.pose.walk = 1;
                tl.to(puppet.mesh.position, { x: puppet.mesh.position.x * .4, y: H * .96, z: H * .3, duration: .55, ease: 'power2.in' }, i * .08);
                tl.to(puppet.mesh.scale, { x: .2, y: .2, z: .2, duration: .55, ease: 'power2.in' }, i * .08);
                tl.call(() => { puppet.mesh.visible = false; }, null, .6 + i * .08);
            }
            if (state.boat) tl.to(state.boat.scale, { x: .01, y: .01, z: .01, duration: .4 }, 0);
            if (state.weather) tl.to(state.weather, { strength: 0, duration: .5 }, 0);
            tl.to(near.rotation, { x: 0, duration: .45, ease: 'power2.in' }, .35);
            tl.to(far.rotation, { x: 0, duration: .45, ease: 'power2.in' }, .48);
            tl.call(() => { near.visible = far.visible = false; }, null, .95);
            tl.to(backdrop.rotation, { x: 0, duration: .75, ease: 'power2.inOut' }, .7);
            tl.to(backdrop.position, { y: 0, duration: .75, ease: 'power2.inOut' }, .7);
            if (quick) tl.timeScale(8);
            invalidate();
        });
    }

    function paintProps(ctx, pose, props) {
        const hand = handPoint(pose);
        if (props.holding) ticket(ctx, hand.x, hand.y - 8, 1.05, props.ticket || 0, -.2);
        if (props.umbrella > 0) umbrella(ctx, hand, 1.55, props.umbrella, -.08);
        if (props.lantern !== undefined) lantern(ctx, hand, 1.5, props.lantern, Math.sin(stage.clock * 1.7) * .12);
        if (props.fiddle) fiddle(ctx, hand, 1.5, Math.sin(stage.clock * 9));
    }

    function update(dt) {
        const state = stage;
        if (!state) return false;
        state.clock += dt;
        for (const puppet of [state.fox, state.hare]) {
            if (!puppet.mesh.visible) continue;
            if (puppet.pose.walk) puppet.pose.phase += dt * 10;
            else puppet.pose.phase *= .9;
            puppet.render(paintProps);
        }
        const boat = state.boat;
        if (boat?.visible) {
            const u = boat.userData;
            u.ctx.clearRect(0, 0, 256, 160);
            ticket(u.ctx, 128, 112, 2.2, 1, 0);
            boat.material.map.needsUpdate = true;
            boat.position.z = Math.sin(state.clock * 2.1) * state.H * .012;
            boat.rotation.y = Math.sin(state.clock * 1.6) * .08;
            if (Math.random() < dt * 6) {
                const p = state.group.localToWorld(boat.position.clone());
                sparkles.emit(p, 1, state.H * .12, 0xffcf73);
            }
        }
        if (state.weather) {
            const w = state.weather, H = state.H;
            w.rain.material.opacity = .55 * w.strength;
            for (let i = 0; i < w.drops.length; i++) {
                const d = w.drops[i];
                d.z -= d.v * dt * H;
                if (d.z < 0) { d.z += H * 1.3; d.x = (Math.random() - .5) * state.W * 1.1; }
                w.positions.set([d.x, d.y, d.z, d.x - .01, d.y, d.z + H * .06], i * 6);
            }
            w.rain.geometry.attributes.position.needsUpdate = true;
        }
        if (state.music && state.notes) {
            const hand = state.hare.mesh.position;
            for (const sprite of state.notes) {
                const u = sprite.userData;
                if (u.life <= 0) {
                    if (Math.random() < dt * 1.6) {
                        u.life = 1;
                        u.x = hand.x + state.W * .03;
                        u.y = hand.y;
                        u.z = state.H * .5;
                        sprite.visible = true;
                    } else { sprite.visible = false; continue; }
                }
                u.life -= dt * .32;
                u.z += dt * state.H * .22;
                u.x += Math.sin(state.clock * 2 + u.sway) * dt * state.H * .12;
                sprite.position.set(u.x, u.y, u.z);
                sprite.material.opacity = Math.min(1, u.life * 3) * Math.min(1, (1 - u.life) * 5);
            }
        }
        const flyer = state.bird;
        if (flyer?.visible && flyer.userData.t >= 0) {
            const u = flyer.userData;
            u.t += dt / 7;
            const x = -state.W * .6 + u.t * state.W * 1.2;
            flyer.position.set(x, state.H * .7, state.H * (.75 + Math.sin(u.t * 9) * .05));
            u.ctx.clearRect(0, 0, 160, 120);
            bird(u.ctx, 80, 70, 2.6, Math.sin(state.clock * 14), 1);
            flyer.material.map.needsUpdate = true;
            if (u.t > 1) { flyer.visible = false; u.t = -1; }
        }
        return true;
    }

    function dispose() {
        const state = stage;
        if (!state) return;
        stage = null;
        state.timeline?.kill();
        state.cast.dispose();
        state.group.traverse(item => {
            if (item.geometry) item.geometry.dispose();
            if (item.material) {
                item.material.map?.dispose();
                item.material.dispose();
            }
        });
        state.group.removeFromParent();
    }

    return {
        play, fold, update, dispose,
        get active() { return Boolean(stage); },
        get frame() { return stage ? { group: stage.group, W: stage.W, H: stage.H } : null; }
    };
}
