import { defineModel, createPlot, gaussian } from '../../lib/figures';

/**
 * The coupling inequality, measured.
 *
 * Five hundred pairs of Brownian motions started at ±1.5 run under one chosen
 * coupling. The green curve is the measured P(τ > t); the dashed grey curve is
 * the total variation distance between the two laws, which for Brownian motion
 * is known exactly:
 *
 *   ‖Law(X_t) − Law(Y_t)‖_TV = 2Φ(d₀ / 2σ√t) − 1.
 *
 * The inequality says green ≥ dashed, always. What the figure shows is how
 * much slack each coupling leaves: none at all for reflection (it is maximal),
 * a wide margin for independent noise, and everything for synchronous noise,
 * whose pairs never meet and whose bound is the useless constant 1.
 *
 * Only the gap Z = X − Y is simulated, since that is all τ depends on: it is a
 * Brownian motion of variance 4σ² under reflection, 2σ² under independent
 * noise, and 0 under synchronous noise.
 */

const PAIRS = 500;
const D0 = 3;           // |x₀ − y₀|
const SIGMA = 1;
const T_MAX = 8;
const RECORD_EVERY = 3;

function erf(x) {
  const s = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
const exactTV = t => (t <= 0 ? 1 : 2 * Phi(D0 / (2 * SIGMA * Math.sqrt(t))) - 1);

// Standard deviation of the gap's driving noise, per coupling.
const SPREAD = { reflection: 2 * SIGMA, independent: Math.SQRT2 * SIGMA, synchronous: 0 };

export default defineModel({
  id: 'sc-bound',
  name: 'The coupling inequality, measured',
  description:
    'A green curve falling from one, the fraction of pairs that have not yet met, '
    + 'drawn above a dashed curve giving the exact total variation distance.',

  zoom: { max: 5 },

  params: [
    { key: 'coupling', label: 'Coupling', type: 'select', default: 'reflection', reinit: true,
      options: [
        { value: 'reflection', label: 'Reflection (maximal)' },
        { value: 'independent', label: 'Independent' },
        { value: 'synchronous', label: 'Synchronous' },
      ] },
  ],

  init() {
    return {
      z: new Float64Array(PAIRS).fill(D0),
      alive: PAIRS,
      t: 0,
      steps: 0,
      hist: [[0, 1, 1]],
    };
  },

  step(state, params, dt, rng) {
    if (state.t >= T_MAX) return;              // the curves are complete; freeze them
    const spread = SPREAD[params.coupling] * Math.sqrt(dt);

    if (spread > 0) {
      for (let i = 0; i < PAIRS; i++) {
        if (state.z[i] === 0) continue;
        const next = state.z[i] + gaussian(rng) * spread;
        if (next <= 0) { state.z[i] = 0; state.alive--; }   // the pair has met
        else state.z[i] = next;
      }
    }

    state.t += dt;
    state.steps++;
    if (state.steps % RECORD_EVERY) return;
    state.hist.push([state.t, state.alive / PAIRS, exactTV(state.t)]);
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const plot = createPlot(ctx, env, {
      xDomain: [0, T_MAX],
      yDomain: [0, 1.06],
      padding: { top: 34, right: 18, bottom: 30, left: 46 },
      labels: state.labels,
    });
    plot.frame({ xLabel: 't' });

    plot.clip(() => {
      plot.curve(exactTV, { color: '#94a3b8', width: 1.5, dash: [5, 4] });
      plot.line(state.hist.map(h => [h[0], h[1]]), { color: '#34d399', width: 2 });
    });

    plot.labelPx(plot.left + 10, plot.top - 22,
      '\\|\\mathrm{Law}(X_t) - \\mathrm{Law}(Y_t)\\|_{TV} \\;\\leq\\; \\mathbb{P}(\\tau > t)',
      { id: 'ineq', anchor: 'top-left' });
  },

  stats(state) {
    const last = state.hist[state.hist.length - 1];
    return [
      { label: 'P(τ > t)', color: '#34d399', value: last ? last[1].toFixed(3) : '—' },
      { label: 'TV (exact)', color: '#94a3b8', dashed: true, value: last ? last[2].toFixed(3) : '—' },
      { label: 'met', value: `${PAIRS - state.alive} / ${PAIRS}` },
    ];
  },
});
