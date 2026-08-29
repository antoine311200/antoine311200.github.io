import { defineModel } from '../core/model';

/**
 * Double pendulum — deterministic chaos.
 *
 * Several copies start from *almost* the same angle. They track each other for
 * a while, then separate; the separation grows exponentially until it
 * saturates. This is the model where "same seed reproduces the run" matters
 * most: the divergence is a property of the dynamics, not of any noise.
 *
 * Integrated with RK4 and 8 substeps per frame — the equations stiffen when the
 * arms fold, and a naive Euler step visibly gains energy within seconds.
 */

const SUBSTEPS = 8;
const TRACE_LEN = 900;

/** y = [θ1, ω1, θ2, ω2] → dy/dt */
function derivs(y, p, out) {
  const [t1, w1, t2, w2] = y;
  const { m1, m2, l1, l2, g } = p;

  const d = t1 - t2;
  const sd = Math.sin(d);
  const cd = Math.cos(d);
  const den = 2 * m1 + m2 - m2 * Math.cos(2 * d);

  out[0] = w1;
  out[2] = w2;
  out[1] = (
    -g * (2 * m1 + m2) * Math.sin(t1)
    - m2 * g * Math.sin(t1 - 2 * t2)
    - 2 * sd * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * cd)
  ) / (l1 * den);
  out[3] = (
    2 * sd * (
      w1 * w1 * l1 * (m1 + m2)
      + g * (m1 + m2) * Math.cos(t1)
      + w2 * w2 * l2 * m2 * cd
    )
  ) / (l2 * den);
}

const k1 = [0, 0, 0, 0], k2 = [0, 0, 0, 0], k3 = [0, 0, 0, 0], k4 = [0, 0, 0, 0];
const tmp = [0, 0, 0, 0];

function rk4(y, p, h) {
  derivs(y, p, k1);
  for (let i = 0; i < 4; i++) tmp[i] = y[i] + (h / 2) * k1[i];
  derivs(tmp, p, k2);
  for (let i = 0; i < 4; i++) tmp[i] = y[i] + (h / 2) * k2[i];
  derivs(tmp, p, k3);
  for (let i = 0; i < 4; i++) tmp[i] = y[i] + h * k3[i];
  derivs(tmp, p, k4);
  for (let i = 0; i < 4; i++) {
    y[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
}

function energy(y, p) {
  const [t1, w1, t2, w2] = y;
  const { m1, m2, l1, l2, g } = p;
  const v1sq = l1 * l1 * w1 * w1;
  const v2sq = l1 * l1 * w1 * w1 + l2 * l2 * w2 * w2
    + 2 * l1 * l2 * w1 * w2 * Math.cos(t1 - t2);
  const T = 0.5 * m1 * v1sq + 0.5 * m2 * v2sq;
  const V = -(m1 + m2) * g * l1 * Math.cos(t1) - m2 * g * l2 * Math.cos(t2);
  return T + V;
}

const RAD = Math.PI / 180;

export default defineModel({
  id: 'double-pendulum',
  name: 'Chaos · Double pendulum',
  description:
    'Several double pendulums released from nearly identical angles, drawn as '
    + 'coloured arms with fading traces of each tip. They overlap at first, then separate.',

  params: [
    { key: 'theta1', label: 'Initial θ₁', tex: '\\theta_1(0)', min: -180, max: 180, step: 1, default: 120, unit: '°', reinit: true, group: 'Release' },
    { key: 'theta2', label: 'Initial θ₂', tex: '\\theta_2(0)', min: -180, max: 180, step: 1, default: 150, unit: '°', reinit: true, group: 'Release' },
    { key: 'copies', label: 'Copies', min: 1, max: 12, step: 1, default: 6, reinit: true, group: 'Release' },
    { key: 'spread', label: 'Perturbation', min: 0, max: 0.5, step: 0.005, default: 0.05, unit: '°', reinit: true, group: 'Release',
      hint: 'Angle offset between successive copies' },

    { key: 'm1', label: 'Mass m₁', tex: 'm_1', min: 0.4, max: 4, step: 0.1, default: 1, group: 'Bodies' },
    { key: 'm2', label: 'Mass m₂', tex: 'm_2', min: 0.4, max: 4, step: 0.1, default: 1, group: 'Bodies' },
    { key: 'l1', label: 'Length ℓ₁', tex: '\\ell_1', min: 0.3, max: 1.4, step: 0.05, default: 1, group: 'Bodies' },
    { key: 'l2', label: 'Length ℓ₂', tex: '\\ell_2', min: 0.3, max: 1.4, step: 0.05, default: 1, group: 'Bodies' },
    { key: 'g', label: 'Gravity', tex: 'g', min: 1, max: 30, step: 0.5, default: 9.81, group: 'Bodies' },
    { key: 'damping', label: 'Damping', min: 0, max: 0.4, step: 0.005, default: 0, group: 'Bodies' },

    { key: 'trace', label: 'Tip traces', type: 'toggle', default: true, group: 'Display' },
    { key: 'arms', label: 'Show arms', type: 'toggle', default: true, group: 'Display' },
  ],

  presets: [
    { name: 'Chaotic',     values: { theta1: 120, theta2: 150, copies: 6, spread: 0.05, damping: 0 } },
    { name: 'Near-linear', values: { theta1: 12, theta2: 8, copies: 3, spread: 0.05, damping: 0 } },
    { name: 'Heavy tip',   values: { m1: 0.6, m2: 3.5, theta1: 100, theta2: 170, copies: 6 } },
    { name: 'Damped',      values: { damping: 0.12, copies: 4, theta1: 150, theta2: 160 } },
  ],

  init(params) {
    const bodies = [];
    for (let i = 0; i < params.copies; i++) {
      const off = i * params.spread * RAD;
      bodies.push({
        y: [params.theta1 * RAD + off, 0, params.theta2 * RAD, 0],
        trace: new Float32Array(TRACE_LEN * 2),
        traceN: 0,
        hue: params.copies === 1 ? 28 : Math.round(20 + (i / params.copies) * 300),
      });
    }
    return { bodies, e0: null, divergence: 0, scale: 1, ox: 0, oy: 0 };
  },

  step(state, params, dt) {
    const p = {
      m1: params.m1, m2: params.m2,
      l1: params.l1, l2: params.l2,
      g: params.g,
    };
    const h = dt / SUBSTEPS;
    const damp = params.damping;

    for (const body of state.bodies) {
      for (let s = 0; s < SUBSTEPS; s++) {
        rk4(body.y, p, h);
        if (damp > 0) {
          const f = Math.exp(-damp * h);
          body.y[1] *= f;
          body.y[3] *= f;
        }
      }
    }

    // Geometry for drawing and for the divergence readout. Traces are stored
    // in model units and scaled at draw time, so changing a length does not
    // misplace the history already recorded.
    for (const body of state.bodies) {
      const [t1, , t2] = body.y;
      const x = Math.sin(t1) * params.l1 + Math.sin(t2) * params.l2;
      const y = Math.cos(t1) * params.l1 + Math.cos(t2) * params.l2;
      body.tipX = x;
      body.tipY = y;
      const i = (body.traceN % TRACE_LEN) * 2;
      body.trace[i] = x;
      body.trace[i + 1] = y;
      body.traceN++;
    }

    if (state.e0 === null) state.e0 = energy(state.bodies[0].y, p);
    state.energy = energy(state.bodies[0].y, p);

    if (state.bodies.length > 1) {
      const a = state.bodies[0];
      const b = state.bodies[state.bodies.length - 1];
      state.divergence = Math.hypot(a.tipX - b.tipX, a.tipY - b.tipY);
    } else {
      state.divergence = 0;
    }
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const reach = params.l1 + params.l2;
    const scale = (Math.min(env.width, env.height) * 0.42) / reach;
    const ox = env.width / 2;
    const oy = env.height * 0.36;
    state.scale = scale;

    // pivot
    ctx.fillStyle = 'rgba(148,163,184,0.55)';
    ctx.beginPath();
    ctx.arc(ox, oy, 3, 0, Math.PI * 2);
    ctx.fill();

    if (params.trace) {
      ctx.lineWidth = 1;
      for (const body of state.bodies) {
        const n = Math.min(body.traceN, TRACE_LEN);
        if (n < 2) continue;
        ctx.strokeStyle = `hsla(${body.hue}, 75%, 62%, 0.35)`;
        ctx.beginPath();
        const start = body.traceN > TRACE_LEN ? body.traceN - TRACE_LEN : 0;
        for (let k = 0; k < n; k++) {
          const idx = ((start + k) % TRACE_LEN) * 2;
          const px = ox + body.trace[idx] * scale;
          const py = oy + body.trace[idx + 1] * scale;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    if (params.arms) {
      for (const body of state.bodies) {
        const [t1, , t2] = body.y;
        const x1 = ox + Math.sin(t1) * params.l1 * scale;
        const y1 = oy + Math.cos(t1) * params.l1 * scale;
        const x2 = x1 + Math.sin(t2) * params.l2 * scale;
        const y2 = y1 + Math.cos(t2) * params.l2 * scale;

        ctx.strokeStyle = `hsla(${body.hue}, 70%, 65%, 0.75)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.fillStyle = `hsl(${body.hue}, 75%, 66%)`;
        ctx.beginPath();
        ctx.arc(x1, y1, 2.6 + params.m1 * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, 2.6 + params.m2 * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (state.labels && state.e0 !== null) {
      const drift = Math.abs((state.energy - state.e0) / state.e0);
      state.labels.push({
        id: 'energy',
        tex: `E = T + V = ${state.energy.toFixed(4)}`
          + `\\quad \\frac{|E - E_0|}{|E_0|} = ${drift.toExponential(1)}`,
        x: 12,
        y: 12,
        anchor: 'top-left',
        chip: true,
      });
    }
  },

  stats(state, params) {
    const drift = state.e0 ? Math.abs((state.energy - state.e0) / state.e0) : 0;
    const out = [
      { label: 'Energy drift', value: `${(drift * 100).toFixed(3)} %` },
    ];
    if (state.bodies.length > 1) {
      out.push({ label: 'Tip separation', value: state.divergence.toFixed(4) });
      out.push({
        label: 'log₁₀ separation',
        value: state.divergence > 0 ? Math.log10(state.divergence).toFixed(2) : '—',
      });
      out.push({ label: 'Released', value: `${params.spread}° apart` });
    }
    return out;
  },
});
