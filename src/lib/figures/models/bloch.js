import { defineModel } from '../core/model';
import {
  createScene, makeCamera, orbitFromPointer,
  cross, len, normalize, scale,
} from '../core/scene3d';

/**
 * Bloch sphere — a qubit under a Hamiltonian, with decoherence.
 *
 * The Bloch vector obeys
 *
 *   dr/dt = ω (n̂ × r)  −  Γ₂ (r_x, r_y, 0)  −  Γ₁ (0, 0, r_z − 1)
 *
 * so unitary evolution is precession about n̂ at the Larmor rate, T₂ collapses
 * the vector onto the z-axis, and T₁ drags it to the north pole. Watching the
 * tip spiral inward is the whole point: a pure state is on the surface, a mixed
 * state is strictly inside, and decoherence is the motion between them.
 *
 * Drag to orbit.
 */

const DEG = Math.PI / 180;
const TRAIL = 420;

const AXES = {
  z:  { label: 'ẑ',        v: [0, 1, 0] },
  x:  { label: 'x̂',        v: [1, 0, 0] },
  y:  { label: 'ŷ',        v: [0, 0, 1] },
  xz: { label: '(x̂+ẑ)/√2', v: normalize([1, 1, 0]) },
  xy: { label: '(x̂+ŷ)/√2', v: normalize([1, 0, 1]) },
};

// Physics is (x, y, z); the scene's vertical is its own y, so the Bloch z-axis
// maps to scene y. One conversion, here, rather than sprinkled through draw().
const toScene = r => [r[0], r[2], r[1]];

function derivative(r, p, out) {
  const n = (AXES[p.axis] || AXES.z).v;
  const nPhys = [n[0], n[2], n[1]];               // back to (x, y, z)
  const prec = cross(nPhys, r);
  const g1 = p.gamma1;
  const g2 = p.gamma2 + p.gamma1 / 2;             // total transverse rate
  out[0] = p.omega * prec[0] - g2 * r[0];
  out[1] = p.omega * prec[1] - g2 * r[1];
  out[2] = p.omega * prec[2] - g1 * (r[2] - 1);
}

const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0], tmp = [0, 0, 0];

function rk4(r, p, h) {
  derivative(r, p, k1);
  for (let i = 0; i < 3; i++) tmp[i] = r[i] + (h / 2) * k1[i];
  derivative(tmp, p, k2);
  for (let i = 0; i < 3; i++) tmp[i] = r[i] + (h / 2) * k2[i];
  derivative(tmp, p, k3);
  for (let i = 0; i < 3; i++) tmp[i] = r[i] + h * k3[i];
  derivative(tmp, p, k4);
  for (let i = 0; i < 3; i++) r[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
}

export default defineModel({
  id: 'bloch-sphere',
  name: 'Qubit · Bloch sphere',
  description:
    'A three-dimensional sphere with labelled axes and an arrow from its centre '
    + 'to a point on the surface, tracing a spiral as it precesses. Drag to rotate the view.',

  params: [
    { key: 'theta0', label: 'Initial θ', tex: '\\theta_0', min: 0, max: 180, step: 1, default: 62, unit: '°', reinit: true, group: 'Initial state' },
    { key: 'phi0', label: 'Initial φ', tex: '\\varphi_0', min: 0, max: 360, step: 1, default: 25, unit: '°', reinit: true, group: 'Initial state' },

    { key: 'axis', label: 'Rotation axis', tex: '\\hat{n}', type: 'select', default: 'z', group: 'Hamiltonian',
      options: Object.entries(AXES).map(([value, a]) => ({ value, label: a.label })) },
    { key: 'omega', label: 'Larmor rate', tex: '\\omega', min: 0, max: 6, step: 0.05, default: 1.6, unit: ' rad/s', group: 'Hamiltonian' },

    { key: 'gamma1', label: 'Relaxation', tex: '\\Gamma_1', min: 0, max: 1, step: 0.01, default: 0, group: 'Decoherence',
      hint: 'T₁: pulls the vector to the north pole' },
    { key: 'gamma2', label: 'Dephasing', tex: '\\Gamma_2', min: 0, max: 1, step: 0.01, default: 0, group: 'Decoherence',
      hint: 'T₂: collapses the vector onto the z-axis' },

    { key: 'spin', label: 'Auto-rotate', min: 0, max: 0.8, step: 0.02, default: 0.14, unit: ' rad/s', group: 'View' },
    { key: 'trail', label: 'Trail', type: 'toggle', default: true, group: 'View' },
    { key: 'axes', label: 'Axes & kets', type: 'toggle', default: true, group: 'View' },
    { key: 'wire', label: 'Wireframe', type: 'toggle', default: true, group: 'View' },
    { key: 'showAxis', label: 'Rotation axis', type: 'toggle', default: true, group: 'View' },
  ],

  presets: [
    { name: 'Precession',   values: { axis: 'z', omega: 1.6, theta0: 62, gamma1: 0, gamma2: 0 } },
    { name: 'Rabi flop',    values: { axis: 'x', omega: 1.6, theta0: 0, phi0: 0, gamma1: 0, gamma2: 0 } },
    { name: 'Pure dephasing', values: { axis: 'z', omega: 2.4, theta0: 90, gamma2: 0.22, gamma1: 0 } },
    { name: 'Amplitude damping', values: { axis: 'z', omega: 2.0, theta0: 120, gamma1: 0.22, gamma2: 0.02 } },
    { name: 'Hadamard axis', values: { axis: 'xz', omega: 1.8, theta0: 0, gamma1: 0, gamma2: 0 } },
  ],

  init(params) {
    const th = params.theta0 * DEG;
    const ph = params.phi0 * DEG;
    return {
      r: [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)],
      trail: new Float32Array(TRAIL * 3),
      trailN: 0,
      camera: makeCamera({ azimuth: 0.72, elevation: 0.3, distance: 3.9 }),
    };
  },

  step(state, params, dt) {
    // Drag wins over auto-rotation, so the reader can hold a viewpoint.
    if (!orbitFromPointer(state.camera, state.pointer)) {
      state.camera.azimuth += params.spin * dt;
    }

    rk4(state.r, params, dt);

    const i = (state.trailN % TRAIL) * 3;
    state.trail[i] = state.r[0];
    state.trail[i + 1] = state.r[1];
    state.trail[i + 2] = state.r[2];
    state.trailN++;
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const scene = createScene(ctx, env, state.camera, {
      fadeSpan: 2.4,
      labels: state.labels,     // KaTeX goes to the HTML overlay, not the canvas
    });

    scene.globe(1, {
      wire: params.wire,
      opacity: 0.8,
      lat: 5,
      lon: 8,
      wireAlpha: 0.5,
      rim: 'rgba(100,116,139,0.5)',
    });

    // Equator, drawn brighter than the rest of the wireframe.
    scene.circle([0, 1, 0], 1, { color: 'rgba(148,163,184,0.6)', width: 1.1, segments: 64 });

    if (params.axes) {
      const L = 1.28;
      const spec = [
        { id: 'k0',  v: [0, L, 0],  c: 'rgba(148,163,184,0.65)', t: '|0\\rangle' },
        { id: 'k1',  v: [0, -L, 0], c: 'rgba(148,163,184,0.65)', t: '|1\\rangle' },
        { id: 'kp',  v: [L, 0, 0],  c: 'rgba(148,163,184,0.45)', t: '|{+}\\rangle' },
        { id: 'km',  v: [-L, 0, 0], c: 'rgba(148,163,184,0.45)', t: '|{-}\\rangle' },
        { id: 'kpi', v: [0, 0, L],  c: 'rgba(148,163,184,0.45)', t: '|{+}i\\rangle' },
        { id: 'kmi', v: [0, 0, -L], c: 'rgba(148,163,184,0.45)', t: '|{-}i\\rangle' },
      ];
      for (const a of spec) {
        scene.segment([0, 0, 0], a.v, { color: a.c, width: 1, alpha: 0.9 });
        // Real kets, set by KaTeX in the overlay rather than punched out of a
        // monospace font on the canvas.
        scene.label(scale(normalize(a.v), L + 0.2), a.t, {
          id: a.id,
          color: '#cbd5e1',
          size: 13,
        });
      }
    }

    if (params.showAxis) {
      const n = (AXES[params.axis] || AXES.z).v;
      scene.segment(scale(n, -1.42), scale(n, 1.42), {
        color: 'rgba(56,189,248,0.55)',
        width: 1.2,
        dash: [5, 4],
      });
      scene.label(scale(n, 1.62), '\\hat{n}', { id: 'nhat', color: '#38bdf8', size: 13 });
    }

    if (params.trail && state.trailN > 1) {
      const n = Math.min(state.trailN, TRAIL);
      const start = state.trailN > TRAIL ? state.trailN - TRAIL : 0;
      const pts = [];
      for (let k = 0; k < n; k++) {
        const idx = ((start + k) % TRAIL) * 3;
        pts.push(toScene([state.trail[idx], state.trail[idx + 1], state.trail[idx + 2]]));
      }
      // Per-segment so the trail correctly disappears behind the sphere.
      scene.path(pts, { color: '#a78bfa', width: 1.3, alpha: 0.75 });
    }

    const rs = toScene(state.r);
    scene.arrow([0, 0, 0], rs, { color: '#fb923c', width: 2.4, head: 10 });
    scene.point(rs, { r: 4, color: '#fdba74' });

    // The master equation, carrying the sliders' current values.
    const w = params.omega.toFixed(2);
    const g1 = params.gamma1.toFixed(2);
    const g2 = params.gamma2.toFixed(2);
    scene.labelPx(12, 12,
      `\\dot{\\mathbf{r}} = ${w}\\,(\\hat{n}\\times\\mathbf{r})`
      + ` - ${g2}\\,\\mathbf{r}_{\\perp} - ${g1}\\,(r_z - 1)\\,\\hat{z}`,
      { id: 'master', anchor: 'top-left' });

    // Purity, pinned to the tip — the number that says whether the state has
    // left the surface.
    scene.label(rs, `|\\mathbf{r}| = ${len(state.r).toFixed(3)}`, {
      id: 'rmag',
      anchor: 'bottom-left',
      dx: 10,
      dy: -6,
      color: '#fdba74',
      size: 12,
      chip: true,
    });

    scene.render();
  },

  stats(state, params) {
    const r = state.r;
    const m = len(r);
    const theta = Math.acos(Math.max(-1, Math.min(1, r[2] / (m || 1))));
    const phi = (Math.atan2(r[1], r[0]) * 180) / Math.PI;
    return [
      { label: 'Bloch vector', color: '#fb923c' },
      { label: 'Trajectory', color: '#a78bfa' },
      { label: '|r|', value: m.toFixed(4) },
      { label: 'Purity', value: ((1 + m * m) / 2).toFixed(4) },
      { label: '⟨σz⟩', value: r[2].toFixed(3) },
      { label: 'θ', value: `${((theta * 180) / Math.PI).toFixed(1)}°` },
      { label: 'φ', value: `${(phi < 0 ? phi + 360 : phi).toFixed(1)}°` },
      { label: 'State', value: m > 0.999 ? 'pure' : m < 0.02 ? 'maximally mixed' : 'mixed' },
    ];
  },
});
