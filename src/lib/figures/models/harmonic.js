import { definePlot } from '../core/definePlot';

/**
 * Damped harmonic oscillator — a plot rather than a simulation.
 *
 *   ẍ + 2ζω₀ẋ + ω₀²x = 0,     x(0) = x₀,  ẋ(0) = v₀
 *
 * Drawn from the closed-form solution, with all three damping regimes handled
 * exactly rather than by integrating: the point of the figure is to watch the
 * character of the solution change as ζ crosses 1, and an integrator would
 * blur exactly that transition.
 *
 * The window slides with time, so it reads as an oscilloscope trace.
 */

const EPS = 1e-9;

function displacement(tau, p) {
  if (tau < 0) return NaN;
  const { omega0: w0, zeta: z, x0, v0 } = p;

  if (z < 1 - EPS) {                       // underdamped
    const wd = w0 * Math.sqrt(1 - z * z);
    const B = (v0 + z * w0 * x0) / wd;
    return Math.exp(-z * w0 * tau) * (x0 * Math.cos(wd * tau) + B * Math.sin(wd * tau));
  }
  if (z <= 1 + EPS) {                      // critically damped
    return Math.exp(-w0 * tau) * (x0 + (v0 + w0 * x0) * tau);
  }
  const s = w0 * Math.sqrt(z * z - 1);     // overdamped
  const rp = -z * w0 + s;
  const rm = -z * w0 - s;
  const C1 = (v0 - rm * x0) / (rp - rm);
  const C2 = x0 - C1;
  return C1 * Math.exp(rp * tau) + C2 * Math.exp(rm * tau);
}

/** Central difference: one derivative formula instead of three. */
function velocity(tau, p) {
  const h = 1e-4;
  if (tau < h) return NaN;
  return (displacement(tau + h, p) - displacement(tau - h, p)) / (2 * h);
}

function envelopeAmplitude(p) {
  const { omega0: w0, zeta: z, x0, v0 } = p;
  if (z >= 1 - EPS) return 0;
  const wd = w0 * Math.sqrt(1 - z * z);
  const B = (v0 + z * w0 * x0) / wd;
  return Math.sqrt(x0 * x0 + B * B);
}

const underdamped = p => p.zeta < 1 - EPS;

export default definePlot({
  id: 'harmonic-oscillator',
  name: 'Oscillation · Damped harmonic',
  description:
    'A scrolling oscilloscope trace of a damped harmonic oscillator, with its '
    + 'exponential envelope and, optionally, its velocity.',

  params: [
    { key: 'x0', label: 'Initial position', tex: 'x_0', min: -1.5, max: 1.5, step: 0.05, default: 1, group: 'Initial conditions' },
    { key: 'v0', label: 'Initial velocity', tex: 'v_0', min: -6, max: 6, step: 0.1, default: 0, group: 'Initial conditions' },

    { key: 'omega0', label: 'Natural frequency', tex: '\\omega_0', min: 0.3, max: 8, step: 0.1, default: 2.5, unit: ' rad/s', group: 'System' },
    { key: 'zeta', label: 'Damping ratio', tex: '\\zeta', min: 0, max: 2, step: 0.01, default: 0.12, group: 'System',
      hint: 'ζ < 1 oscillates, ζ = 1 is critical, ζ > 1 crawls back' },

    { key: 'window', label: 'Window', min: 3, max: 40, step: 1, default: 14, unit: ' s', group: 'View' },
    { key: 'velocity', label: 'Velocity', type: 'toggle', default: false, group: 'View' },
    { key: 'envelope', label: 'Envelope', type: 'toggle', default: true, group: 'View' },
    { key: 'autoscale', label: 'Auto y-scale', type: 'toggle', default: false, group: 'View' },
  ],

  presets: [
    { name: 'Light damping',   values: { zeta: 0.06, omega0: 3.2, x0: 1, v0: 0 } },
    { name: 'Critical ζ = 1',  values: { zeta: 1.00, omega0: 2.5, x0: 1, v0: 0 } },
    { name: 'Overdamped',      values: { zeta: 1.60, omega0: 2.5, x0: 1, v0: 0 } },
    { name: 'Kicked from rest',values: { zeta: 0.10, omega0: 4.0, x0: 0, v0: 4 } },
    { name: 'Undamped',        values: { zeta: 0.00, omega0: 2.0, x0: 1, v0: 0 } },
  ],

  xLabel: 't  (s)',
  yLabel: 'x(t)',

  xDomain: (p, t) => (t <= p.window ? [0, p.window] : [t - p.window, t]),

  yDomain: (p) => {
    if (p.autoscale) return 'auto';
    const reach = Math.max(Math.abs(p.x0), envelopeAmplitude(p), Math.abs(p.v0) / Math.max(p.omega0, 0.5));
    const m = Math.max(0.25, reach) * 1.25;
    return [-m, m];
  },

  autoRange: { symmetric: true, ease: 0.08 },

  series: [
    {
      id: 'envelope+', label: 'Envelope', color: '#64748b', dash: [4, 4], width: 1,
      visible: p => p.envelope && underdamped(p),
      fn: (tau, p) => (tau < 0 ? NaN : envelopeAmplitude(p) * Math.exp(-p.zeta * p.omega0 * tau)),
    },
    {
      id: 'envelope-', label: 'Envelope (−)', color: '#64748b', dash: [4, 4], width: 1,
      visible: p => p.envelope && underdamped(p),
      fn: (tau, p) => (tau < 0 ? NaN : -envelopeAmplitude(p) * Math.exp(-p.zeta * p.omega0 * tau)),
    },
    {
      id: 'v', label: 'v(t) / ω₀', color: '#38bdf8', dash: [6, 3], width: 1.4,
      visible: p => p.velocity,
      fn: (tau, p) => velocity(tau, p) / p.omega0,
    },
    {
      id: 'x', label: 'x(t)', color: '#fb923c', width: 2,
      fn: (tau, p) => displacement(tau, p),
    },
  ],

  /** Mark the leading edge so "now" is obvious while the window scrolls. */
  decorate(plot, p, t) {
    if (t <= 0) return;
    const x = displacement(t, p);
    if (!isFinite(x)) return;
    plot.dot(t, x, { color: '#fb923c', r: 3.4, ring: true });
  },

  stats(state, p) {
    const z = p.zeta;
    const regime = z < 1 - EPS ? (z === 0 ? 'undamped' : 'underdamped')
      : z <= 1 + EPS ? 'critically damped' : 'overdamped';
    const out = [
      { label: 'x(t)', color: '#fb923c' },
      { label: 'Regime', value: regime },
      { label: 'ω₀', value: p.omega0.toFixed(2) },
    ];
    if (z < 1 - EPS) {
      const wd = p.omega0 * Math.sqrt(1 - z * z);
      out.push({ label: 'ω_d', value: wd.toFixed(3) });
      out.push({ label: 'Period', value: `${(2 * Math.PI / wd).toFixed(2)} s` });
      if (z > 0) out.push({ label: 'Q', value: (1 / (2 * z)).toFixed(2) });
    }
    if (state.hover) {
      const hit = state.hover.values.find(v => v.id === 'x');
      if (hit) out.push({ label: `x(${state.hover.x.toFixed(2)})`, value: hit.y.toFixed(3) });
    }
    return out;
  },
});
