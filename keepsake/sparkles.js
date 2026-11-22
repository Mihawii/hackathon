// Gold dust for the book's magic: the cover, a turning leaf and the pop-up
// stage all shed the same motes so the effects read as one spell.
import * as THREE from 'three';

const vertex = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(.1, -mv.z);
  vAlpha = aAlpha;
  vColor = aColor;
}`;

const fragment = `
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  float core = exp(-r * r * 9.0);
  float cross = exp(-abs(p.x) * 18.0) * exp(-abs(p.y) * 2.6) + exp(-abs(p.y) * 18.0) * exp(-abs(p.x) * 2.6);
  float a = (core + cross * .55) * vAlpha;
  if (a < .01) discard;
  gl_FragColor = vec4(vColor * a, a);
}`;

export function createSparkles(scene, max = 900) {
    const positions = new Float32Array(max * 3);
    const colors = new Float32Array(max * 3);
    const sizes = new Float32Array(max);
    const alphas = new Float32Array(max);
    const motes = Array.from({ length: max }, () => ({ life: 0, span: 1, vx: 0, vy: 0, vz: 0, size: 1, twinkle: 0 }));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.ShaderMaterial({
        vertexShader: vertex, fragmentShader: fragment,
        uniforms: { uScale: { value: 300 } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = 10;
    scene.add(points);
    let cursor = 0, alive = 0;
    const tint = new THREE.Color();
    const palette = [0xffe3a1, 0xffd27a, 0xfff4d6, 0xf0b85c];

    function emit(at, count = 20, spread = .3, color = null, lift = 1) {
        for (let n = 0; n < count; n++) {
            const i = cursor;
            cursor = (cursor + 1) % max;
            const m = motes[i];
            const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
            positions[i * 3] = at.x + Math.cos(a) * r * .5;
            positions[i * 3 + 1] = at.y + Math.sin(a) * r * .5;
            positions[i * 3 + 2] = at.z + Math.random() * spread * .2;
            m.vx = Math.cos(a) * spread * (.4 + Math.random() * .9);
            m.vy = Math.sin(a) * spread * (.4 + Math.random() * .9);
            m.vz = (.25 + Math.random() * .8) * lift * Math.max(.35, spread);
            m.span = m.life = 1.1 + Math.random() * 1.6;
            m.size = 6 + Math.random() * 16;
            m.twinkle = Math.random() * 20;
            tint.set(color ?? palette[(Math.random() * palette.length) | 0]);
            colors[i * 3] = tint.r; colors[i * 3 + 1] = tint.g; colors[i * 3 + 2] = tint.b;
        }
        alive = max;
    }

    function update(dt, time) {
        if (!alive) return false;
        let count = 0;
        const drag = Math.exp(-1.9 * dt);
        for (let i = 0; i < max; i++) {
            const m = motes[i];
            if (m.life <= 0) { alphas[i] = 0; continue; }
            m.life -= dt;
            count++;
            m.vx *= drag; m.vy *= drag; m.vz = m.vz * drag + .05 * dt;
            positions[i * 3] += m.vx * dt;
            positions[i * 3 + 1] += m.vy * dt;
            positions[i * 3 + 2] += m.vz * dt;
            const age = 1 - m.life / m.span;
            const fade = Math.min(1, age * 7) * Math.min(1, m.life / (m.span * .5));
            alphas[i] = fade * (.55 + .45 * Math.sin(time * 9 + m.twinkle));
            sizes[i] = m.size * (1 - age * .45);
        }
        alive = count;
        for (const name of ['position', 'aAlpha', 'aSize', 'aColor']) geometry.attributes[name].needsUpdate = true;
        return count > 0;
    }

    return {
        emit, update,
        setScale(pixelsPerUnit) { material.uniforms.uScale.value = pixelsPerUnit; },
        dispose() { geometry.dispose(); material.dispose(); points.removeFromParent(); }
    };
}
