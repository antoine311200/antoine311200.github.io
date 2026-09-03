import { defineModel } from '../core/model';
import { createScene, makeCamera, orbitFromPointer } from '../core/scene3d';

/**
 * The Lorenz attractor — 3D that is not a sphere.
 *
 *   ẋ = σ(y − x),   ẏ = x(ρ − z) − y,   ż = xy − βz
 *
 * A counterpart to `bloch`: no globe, no fixed radius, an unbounded trajectory
 * that has to be scaled into view and drawn as thousands of segments. The
 * depth cue therefore comes entirely from `fade` and from chunking the trail so
 * that the near lobe paints over the far one.
 *
 * Several trajectories start a fraction apart, so the figure makes the same
 * point as `double-pendulum` but in a system whose divergence is famous.
 *
 * Drag to orbit.
 */

const SUBSTEPS = 8;
const TRAIL_MAX = 4000;
const SCALE = 22;       // attractor units per scene unit
const Z_CENTRE = 25;    // the attractor floats around z ≈ 25

// Physics (x, y, z) → scene (x, up, depth): the attractor's z is the vertical.
const toScene = (x, y, z) => [x / SCALE, (z - Z_CENTRE) / SCALE, y / SCALE];

function derivative(s, p, out) {
  out[0] = p.sigma * (s[1] - s[0]);
  out[1] = s[0] * (p.rho - s[2]) - s[1];
  out[2] = s[0] * s[1] - p.beta * s[2];
}

const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0], tmp = [0, 0, 0];

function rk4(s, p, h) {
  derivative(s, p, k1);
  for (let i = 0; i < 3; i++) tmp[i] = s[i] + (h / 2) * k1[i];
  derivative(tmp, p, k2);
  for (let i = 0; i < 3; i++) tmp[i] = s[i] + (h / 2) * k2[i];
  derivative(tmp, p, k3);
  for (let i = 0; i < 3; i++) tmp[i] = s[i] + h * k3[i];
  derivative(tmp, p, k4);
  for (let i = 0; i < 3; i++) s[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
}

export default defineModel({
  id: 'lorenz',
  name: 'Chaos · Lorenz attractor',
  description:
    'A three-dimensional butterfly-shaped curve traced by two coloured trajectories '
    + 'looping between its two lobes. Drag to rotate the view.',

  params: [
    { key: 'sigma', label: 'Prandtl', tex: '\\sigma', min: 1, max: 20, step: 0.1, default: 10, group: 'System' },
    { key: 'rho', label: 'Rayleigh', tex: '\\rho', min: 0.5, max: 50, step: 0.1, default: 28, group: 'System' },
    { key: 'beta', label: 'Geometry', tex: '\\beta', min: 0.4, max: 5, step: 0.02, default: 2.67, group: 'System' },

    { key: 'copies', label: 'Trajectories', min: 1, max: 5, step: 1, default: 2, reinit: true, group: 'Release' },
    { key: 'spread', label: 'Separation', min: 0, max: 0.05, step: 0.001, default: 0.006, reinit: true, group: 'Release',
      hint: 'Initial gap between successive trajectories' },

    { key: 'timeScale', label: 'Time scale', min: 0.1, max: 3, step: 0.05, default: 1, group: 'View' },
    { key: 'trail', label: 'Trail length', min: 200, max: TRAIL_MAX, step: 100, default: 1800, group: 'View' },
    { key: 'spin', label: 'Auto-rotate', min: 0, max: 0.8, step: 0.02, default: 0.12, unit: ' rad/s', group: 'View' },
    { key: 'axes', label: 'Axes', type: 'toggle', default: true, group: 'View' },
    { key: 'head', label: 'Leading point', type: 'toggle', default: true, group: 'View' },
  ],

  presets: [
    { name: 'Classic',        values: { sigma: 10, rho: 28, beta: 2.67, copies: 2, spread: 0.006 } },
    { name: 'Single orbit',   values: { rho: 14, copies: 1, trail: 3000 } },
    { name: 'Pre-chaotic',    values: { rho: 20, copies: 2, spread: 0.006 } },
    { name: 'Wild',           values: { rho: 45, sigma: 14, copies: 3 } },
    { name: 'Five apart',     values: { copies: 5, spread: 0.02, trail: 900 } },
  ],

  init(params) {
    const bodies = [];
    for (let i = 0; i < params.copies; i++) {
      bodies.push({
        s: [1 + i * params.spread, 1, 1],
        trail: new Float32Array(TRAIL_MAX * 3),
        n: 0,
        hue: params.copies === 1 ? 28 : Math.round(24 + (i / params.copies) * 280),
      });
    }
    return {
      bodies,
      camera: makeCamera({ azimuth: 0.7, elevation: 0.22, distance: 3.6 }),
      divergence: 0,
    };
  },

  step(state, params, dt) {
    if (!orbitFromPointer(state.camera, state.pointer)) {
      state.camera.azimuth += params.spin * dt;
    }

    const h = (dt * params.timeScale) / SUBSTEPS;
    for (const b of state.bodies) {
      for (let i = 0; i < SUBSTEPS; i++) rk4(b.s, params, h);

      // A blown-up trajectory would poison the trail forever; reseed instead.
      if (!isFinite(b.s[0]) || Math.abs(b.s[0]) > 1e4) {
        b.s = [1, 1, 1];
        b.n = 0;
      }

      const i = (b.n % TRAIL_MAX) * 3;
      b.trail[i] = b.s[0];
      b.trail[i + 1] = b.s[1];
      b.trail[i + 2] = b.s[2];
      b.n++;
    }

    if (state.bodies.length > 1) {
      const a = state.bodies[0].s;
      const z = state.bodies[state.bodies.length - 1].s;
      state.divergence = Math.hypot(a[0] - z[0], a[1] - z[1], a[2] - z[2]);
    } else {
      state.divergence = 0;
    }
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const scene = createScene(ctx, env, state.camera, {
      fadeSpan: 3,
      labels: state.labels,
    });

    if (params.axes) {
      const L = 1.15;
      scene.segment([-L, 0, 0], [L, 0, 0], { color: 'rgba(100,116,139,0.35)', width: 1 });
      scene.segment([0, 0, -L], [0, 0, L], { color: 'rgba(100,116,139,0.35)', width: 1 });
      scene.segment([0, -L, 0], [0, L, 0], { color: 'rgba(100,116,139,0.35)', width: 1 });
      scene.label([L + 0.1, 0, 0], 'x', { id: 'ax', color: '#64748b', size: 12 });
      scene.label([0, 0, L + 0.1], 'y', { id: 'ay', color: '#64748b', size: 12 });
      scene.label([0, L + 0.1, 0], 'z', { id: 'az', color: '#64748b', size: 12 });
    }

    // The trail is split into chunks, each sorted as one item: enough depth
    // ordering that the near lobe paints over the far one, without emitting a
    // sortable item per segment.
    const CHUNKS = 10;
    for (const b of state.bodies) {
      const want = Math.min(b.n, params.trail, TRAIL_MAX);
      if (want < 2) continue;
      const start = b.n - want;
      const per = Math.ceil(want / CHUNKS);

      for (let c = 0; c < CHUNKS; c++) {
        const from = c * per;
        const to = Math.min(want, from + per + 1);   // +1 so chunks join up
        if (to - from < 2) continue;
        const pts = [];
        for (let k = from; k < to; k++) {
          const idx = ((start + k) % TRAIL_MAX) * 3;
          pts.push(toScene(b.trail[idx], b.trail[idx + 1], b.trail[idx + 2]));
        }
        scene.polyline(pts, {
          color: `hsl(${b.hue}, 78%, 64%)`,
          width: 1.1,
          alpha: 0.25 + 0.6 * (to / want),   // older tail is fainter
        });
      }

      if (params.head) {
        scene.point(toScene(b.s[0], b.s[1], b.s[2]), {
          r: 3.4,
          color: `hsl(${b.hue}, 85%, 70%)`,
        });
      }
    }

    scene.labelPx(12, 12,
      '\\begin{aligned}'
      + `\\dot{x} &= ${params.sigma.toFixed(1)}\\,(y - x) \\\\`
      + `\\dot{y} &= x\\,(${params.rho.toFixed(1)} - z) - y \\\\`
      + `\\dot{z} &= xy - ${params.beta.toFixed(2)}\\,z`
      + '\\end{aligned}',
      { id: 'system', anchor: 'top-left' });

    scene.render();
  },

  stats(state, params) {
    const s = state.bodies[0].s;
    const out = [
      { label: 'x', value: s[0].toFixed(2) },
      { label: 'y', value: s[1].toFixed(2) },
      { label: 'z', value: s[2].toFixed(2) },
    ];
    if (state.bodies.length > 1) {
      out.push({ label: 'Separation', value: state.divergence.toExponential(2) });
      out.push({ label: 'Released', value: `${params.spread} apart` });
    }
    // ρ = 24.74 is where the symmetric fixed points lose stability.
    const rhoC = params.sigma * (params.sigma + params.beta + 3) / (params.sigma - params.beta - 1);
    out.push({
      label: 'ρ critical',
      value: isFinite(rhoC) && rhoC > 0 ? rhoC.toFixed(2) : '—',
    });
    out.push({ label: 'Regime', value: params.rho > rhoC ? 'chaotic' : 'settles' });
    return out;
  },
});
