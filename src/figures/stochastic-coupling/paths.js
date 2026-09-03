import { defineModel, createPlot, layout, gaussian } from '../../lib/figures';

/**
 * Two copies of the same diffusion, driven by related noises.
 *
 *   dX = -V'(X) dt + σ dW,        dY = -V'(Y) dt + σ dW̃
 *
 * Whatever relation W̃ bears to W, each copy is a copy of the same process —
 * only the joint law changes. Four relations are offered:
 *
 *   synchronous  dW̃ = dW          the gap follows a random ODE: no noise at all
 *   reflection   dW̃ = -dW         the gap is a BM of variance 4σ², so it hits 0
 *   independent  W̃ ⫫ W            variance 2σ²: it hits 0, but takes longer
 *   nudged       dW̃ = dW, plus a drift pulling Y toward X — converges, never meets
 *
 * Everything the reader does not need to touch is a constant here rather than
 * a slider: the point of the figure is the choice of coupling.
 */

const SIGMA = 0.6;
const WINDOW = 16;      // seconds of history on screen
const SUBSTEPS = 4;
const HIST = 4000;
const THETA = 1.2;      // curvature of the single well
const BARRIER = 6;      // steepness of the double well
const KAPPA = 1.2;      // strength of the nudge

const DRIFT = {
  flat: () => 0,
  well: x => -THETA * x,
  doublewell: x => -BARRIER * (x * x * x - x),
};

const RULE = {
  synchronous: 'd\\widetilde{W} = dW',
  reflection: 'd\\widetilde{W} = -dW',
  independent: '\\widetilde{W} \\perp W',
  nudged: 'd\\widetilde{W} = dW,\\; +\\,\\kappa(X-Y)\\,dt',
};

const CAN_MEET = { synchronous: false, reflection: true, independent: true, nudged: false };

export default defineModel({
  id: 'sc-paths',
  name: 'Two coupled paths',
  description:
    'Two diffusion paths drawn against time, one orange and one blue, with the '
    + 'gap between them plotted underneath.',

  zoom: { max: 5 },

  params: [
    { key: 'coupling', label: 'Coupling', type: 'select', default: 'reflection', reinit: true,
      options: [
        { value: 'reflection', label: 'Reflection (mirror)' },
        { value: 'synchronous', label: 'Synchronous' },
        { value: 'independent', label: 'Independent' },
        { value: 'nudged', label: 'Nudged (asymptotic)' },
      ] },
    { key: 'potential', label: 'Potential', type: 'select', default: 'flat', reinit: true,
      options: [
        { value: 'flat', label: 'Flat — Brownian motion' },
        { value: 'well', label: 'Single well — convex' },
        { value: 'doublewell', label: 'Double well — not convex' },
      ] },
    { key: 'logGap', label: 'Log scale for the gap', type: 'toggle', default: false },
  ],

  init() {
    return { x: 1.2, y: -1.2, t: 0, hist: [[0, 1.2, -1.2]], coupled: false, tau: null, range: null };
  },

  step(state, params, dt, rng) {
    const b = DRIFT[params.potential] || DRIFT.flat;
    const h = dt / SUBSTEPS;
    const rootH = Math.sqrt(h);
    const mode = params.coupling;

    for (let s = 0; s < SUBSTEPS; s++) {
      const gap = state.x - state.y;

      const dW = gaussian(rng) * rootH;
      let dWt;
      if (state.coupled) dWt = dW;
      else if (mode === 'independent') dWt = gaussian(rng) * rootH;
      else if (mode === 'reflection') dWt = -dW;
      else dWt = dW;                              // synchronous and nudged share it

      state.x += b(state.x) * h + SIGMA * dW;
      state.y += b(state.y) * h + SIGMA * dWt
        + (mode === 'nudged' ? KAPPA * gap * h : 0);
      state.t += h;

      // The coupling succeeds when the gap changes sign: the paths have
      // crossed, so from that instant they may be glued together.
      if (!state.coupled && CAN_MEET[mode]) {
        const now = state.x - state.y;
        if (gap === 0 || gap * now <= 0) {
          state.coupled = true;
          state.tau = state.t;
          state.y = state.x;
        }
      }
    }

    state.hist.push([state.t, state.x, state.y]);
    if (state.hist.length > HIST) state.hist.shift();
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const L = layout(env, {
      dir: 'column',
      gap: 6,
      children: [{ id: 'paths', flex: 1.7 }, { id: 'gap', flex: 1 }],
    });

    const t1 = Math.max(WINDOW, state.t);
    const t0 = t1 - WINDOW;
    const visible = state.hist.filter(h => h[0] >= t0);

    // Eased vertical range, so the axis follows a wandering path instead of
    // jumping every time it reaches a new extreme.
    let lo = -1.8;
    let hi = 1.8;
    for (const [, x, y] of visible) { lo = Math.min(lo, x, y); hi = Math.max(hi, x, y); }
    const pad = (hi - lo) * 0.1;
    state.range = state.range
      ? [state.range[0] + (lo - pad - state.range[0]) * 0.06,
         state.range[1] + (hi + pad - state.range[1]) * 0.06]
      : [lo - pad, hi + pad];

    // ── the two paths ──
    const paths = createPlot(ctx, env, {
      rect: L.paths,
      xDomain: [t0, t1],
      yDomain: state.range,
      padding: { top: 16, right: 16, bottom: 18, left: 42 },
      labels: state.labels,
    });
    paths.frame({ yLabel: 'x' });
    paths.clip(() => {
      paths.line(visible.map(h => [h[0], h[2]]), { color: '#38bdf8', width: 1.6 });
      paths.line(visible.map(h => [h[0], h[1]]), { color: '#fb923c', width: 1.6 });
      if (state.tau !== null && state.tau >= t0) {
        paths.vline(state.tau, { color: 'rgba(52,211,153,0.85)', dash: [4, 3], width: 1.2 });
      }
      paths.dot(state.t, state.y, { color: '#38bdf8', r: 3.4, ring: true });
      paths.dot(state.t, state.x, { color: '#fb923c', r: 3.4, ring: true });
    });
    paths.labelPx(paths.left + 10, paths.top + 6, RULE[params.coupling] || RULE.reflection,
      { id: 'rule', anchor: 'top-left' });
    if (state.tau !== null && state.tau >= t0) {
      paths.label(state.tau, state.range[1], '\\tau',
        { id: 'tau', anchor: 'top', dy: 3, color: '#34d399' });
    }

    // ── the gap ──
    const log = params.logGap;
    const gaps = visible.map(h => [
      h[0],
      log ? Math.log10(Math.max(1e-12, Math.abs(h[1] - h[2]))) : h[1] - h[2],
    ]);
    let glo;
    let ghi;
    if (log) {
      const vs = gaps.map(g => g[1]).filter(isFinite);
      ghi = vs.length ? Math.max(0.4, ...vs) : 0.4;
      glo = Math.max(vs.length ? Math.min(...vs) - 0.3 : -3, ghi - 8);
    } else {
      const m = Math.max(0.4, ...gaps.map(g => Math.abs(g[1])));
      glo = -m * 1.2;
      ghi = m * 1.2;
    }

    const gap = createPlot(ctx, env, {
      rect: L.gap,
      xDomain: [t0, t1],
      yDomain: [glo, ghi],
      padding: { top: 12, right: 16, bottom: 24, left: 42 },
      labels: state.labels,
    });
    gap.frame({ xLabel: 't' });
    gap.clip(() => {
      gap.line(gaps, { color: '#a78bfa', width: 1.6 });
      if (state.tau !== null && state.tau >= t0) {
        gap.vline(state.tau, { color: 'rgba(52,211,153,0.85)', dash: [4, 3], width: 1.2 });
      }
    });
    gap.labelPx(gap.left + 10, gap.top + 4,
      log ? '\\log_{10}|X_t - Y_t|' : 'X_t - Y_t',
      { id: 'gap', anchor: 'top-left', color: '#a78bfa' });
  },

  stats(state, params) {
    const gap = Math.abs(state.x - state.y);
    const out = [
      { label: 'X', color: '#fb923c' },
      { label: 'Y', color: '#38bdf8' },
      { label: '|X − Y|', value: gap < 1e-10 ? '0' : gap.toPrecision(3) },
    ];
    if (state.coupled) out.push({ label: 'τ', value: state.tau.toFixed(2), color: '#34d399' });
    else if (CAN_MEET[params.coupling]) out.push({ label: 'τ', value: 'not yet' });
    else out.push({ label: 'τ', value: 'never' });
    return out;
  },
});
