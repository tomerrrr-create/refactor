// Cylindrical particle coordinates become a ground-level perspective view.
// Each particle has a height, radius and angular position around a vertical axis.
// The frame is explicit in rules/checkpoints; no wall clock or session state.
let geometry;
const tau = Math.PI * 2;
const noise = i => ((Math.imul(i ^ (i >>> 16), 0x45d9f3b) >>> 0) % 65536) / 65536;
function particlesFor(n) {
    const levels = Math.max(16, Math.ceil(n * 1.1));
    const around = Math.max(24, n * 2);
    const particles = [];
    for (let row = 0; row < levels; row++) for (let col = 0; col < around; col++) {
        const id = row * around + col, h = (row + noise(id + 17)) / levels;
        const angle = tau * (col + noise(id + 91) * .8) / around;
        // Five loose helical strands; gaps allow the far side to show through.
        const strand = Math.cos(angle * 5 + h * tau * 3);
        const core = strand < -.65 + noise(id + 53) * .45;
        if (core && noise(id + 239) > .3) continue;
        particles.push({h, angle, core, layer: core ? .35 + .4 * noise(id + 173) : .8 + .2 * noise(id + 173), jitter: noise(id + 719)});
    }
    return {n, particles, depth: new Float64Array(n * n), ranks: new Int32Array(n * n)};
}
export function projectTornadoParticle(n, h, angle, layer = 1, phase = 0, out = {}) {
    const span = Math.max(1, n - 1);
    const radius = span * (.035 + .32 * (1 - h) ** 1.7) * layer;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const y = span * (.14 + .79 * h);
    const eye = span * .88, distance = span * 3;
    const perspective = distance / (distance - z);
    const lean = span * .018 * Math.sin(h * 5 + phase * .12) * Math.sin(Math.PI * h);
    out.x = span * .5 + (x + lean) * perspective;
    out.y = eye + (y - eye) * perspective;
    out.z = z; out.radius = radius;
    return out;
}
export function runTornadoGeneration(n, board, {paletteLength = 23, frame = 0} = {}) {
    if (!geometry || geometry.n !== n) geometry = particlesFor(n);
    const {particles, depth, ranks} = geometry;
    depth.fill(-Infinity); ranks.fill(0);
    const phase = frame * .045, projected = {};
    for (const p of particles) {
        // Faster narrow lower turns, bounded so the foot remains readable.
        const speed = .7 + 1.0 * p.h;
        const angle = p.angle + phase * speed;
        const h = Math.max(0, Math.min(1, p.h + .007 * Math.sin(phase * .3 + p.angle)));
        projectTornadoParticle(n, h, angle, p.layer, phase, projected);
        const col = Math.round(projected.x), row = Math.round(projected.y);
        if (col < 0 || row < 0 || col >= n || row >= n) continue;
        const i = row * n + col;
        if (projected.z <= depth[i]) continue;
        depth[i] = projected.z;
        // Pigment follows the particle around the axis. Front particles are
        // stronger; back particles recede, always within the current palette.
        const pigment = .28 + .54 * p.h + .16 * Math.sin(p.angle + p.h * tau * 2) + .035 * p.jitter;
        const lighting = .42 + .58 * (Math.sin(angle) + 1) / 2;
        ranks[i] = Math.max(0, Math.min(paletteLength - 1, Math.round(pigment * lighting * (p.core ? .75 : 1) * (paletteLength - 1))));
    }
    for (let i = 0; i < board.length; i++) {
        if (board[i].isGold) continue;
        board[i].k = board[i].v = ranks[i];
    }
    return board;
}
