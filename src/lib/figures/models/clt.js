import { defineModel } from '../core/model';
import { createPlot } from '../core/plot';
import { gaussian } from '../core/rng';

/**
 * The central limit theorem, and the case where it fails.
 *
 * Sample means of n draws are standardised and histogrammed against the
 * standard normal. Every heavy-tailed-but-integrable law converges, however
 * slowly — and Cauchy, which has no mean and no variance, does not converge at
 * all: the sample mean of n Cauchy draws is Cauchy again, for every n. Both
 * densities are overlaid so the failure is visible rather than asserted.
 *
 * The figure is also the reason the library insists on a seeded RNG: ↺ replays
 * the identical sequence of draws, so two parameter settings can be compared
 * on the same randomness.
 */

const SQRT2PI = Math.sqrt(2 * Math.PI);
const normalPdf = z => Math.exp(-0.5 * z * z) / SQRT2PI;
const cauchyPdf = z => 1 / (Math.PI * (1 + z * z));

const DISTS = {
  uniform: {
    label: 'Uniform(0, 1)',
    tex: '\\mathrm{Unif}(0,1)',
    mean: 0.5,
    sd: Math.sqrt(1 / 12),
    draw: rng => rng(),
  },
  bernoulli: {
    label: 'Bernoulli(0.15)',
    tex: '\\mathrm{Bern}(0.15)',
    mean: 0.15,
    sd: Math.sqrt(0.15 * 0.85),
    draw: rng => (rng() < 0.15 ? 1 : 0),
  },
  exponential: {
    label: 'Exponential(1)',
    tex: '\\mathrm{Exp}(1)',
    mean: 1,
    sd: 1,
    draw: rng => -Math.log(1 - rng()),
  },
  lognormal: {
    label: 'Lognormal(0, 1)',
    tex: '\\mathrm{LogN}(0,1)',
    mean: Math.exp(0.5),
    sd: Math.sqrt((Math.E - 1) * Math.E),
    draw: rng => Math.exp(gaussian(rng)),
  },
  cauchy: {
    label: 'Cauchy(0, 1) — no mean',
    tex: '\\mathrm{Cauchy}(0,1)',
    mean: 0,        // used only to centre the axis; the law has no mean
    sd: 1,          // and no variance — so no standardisation is possible
    draw: rng => Math.tan(Math.PI * (rng() - 0.5)),
    heavy: true,
  },
};

const LO = -4.5;
const HI = 4.5;

function emptyHistogram(bins) {
  return { counts: new Float64Array(bins), total: 0, outside: 0, sum: 0, sumSq: 0 };
}

export default defineModel({
  id: 'central-limit',
  name: 'Probability · Central limit theorem',
  description:
    'A histogram of standardised sample means filling in under a bell curve, '
    + 'with the normal density drawn over it.',

  params: [
    { key: 'dist', label: 'Draws from', type: 'select', default: 'exponential', reinit: true, group: 'Experiment',
      options: Object.entries(DISTS).map(([value, d]) => ({ value, label: d.label })) },
    { key: 'n', label: 'Sample size', tex: 'n', min: 1, max: 200, step: 1, default: 5, reinit: true, group: 'Experiment' },
    { key: 'perFrame', label: 'Means / frame', min: 1, max: 400, step: 1, default: 40, group: 'Experiment' },
    { key: 'bins', label: 'Bins', min: 20, max: 140, step: 2, default: 64, reinit: true, group: 'Experiment' },

    { key: 'showNormal', label: 'Normal density', type: 'toggle', default: true, group: 'View' },
    { key: 'showCauchy', label: 'Cauchy density', type: 'toggle', default: true, group: 'View' },
    { key: 'freeze', label: 'Stop drawing', type: 'toggle', default: false, group: 'View' },
  ],

  presets: [
    { name: 'n = 1',        values: { dist: 'exponential', n: 1 } },
    { name: 'n = 5',        values: { dist: 'exponential', n: 5 } },
    { name: 'n = 50',       values: { dist: 'exponential', n: 50 } },
    { name: 'Rare events',  values: { dist: 'bernoulli', n: 8 } },
    { name: 'Heavy tail',   values: { dist: 'lognormal', n: 30 } },
    { name: 'CLT fails',    values: { dist: 'cauchy', n: 100 } },
  ],

  actions: [
    { id: 'burst', label: 'Draw 20 000', run(state) { state.burst = 20000; } },
    { id: 'clear', label: 'Clear', run(state, params) {
      Object.assign(state, emptyHistogram(params.bins));
    } },
  ],

  init(params) {
    return { ...emptyHistogram(params.bins), burst: 0, peak: 0.45 };
  },

  step(state, params, dt, rng) {
    if (params.freeze && !state.burst) return;

    const dist = DISTS[params.dist] || DISTS.uniform;
    const n = params.n;
    const bins = params.bins;
    const width = (HI - LO) / bins;

    let draws = params.perFrame;
    if (state.burst > 0) {
      const chunk = Math.min(4000, state.burst);
      draws += chunk;
      state.burst -= chunk;
    }

    for (let d = 0; d < draws; d++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += dist.draw(rng);
      const mean = sum / n;

      // Cauchy has no σ to divide by, so its mean is plotted raw — which is
      // exactly the point: it is Cauchy(0,1) again, for every n.
      const z = dist.heavy
        ? mean
        : (Math.sqrt(n) * (mean - dist.mean)) / dist.sd;

      state.total++;
      state.sum += z;
      state.sumSq += z * z;

      const b = Math.floor((z - LO) / width);
      if (b < 0 || b >= bins) { state.outside++; continue; }
      state.counts[b]++;
    }
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const dist = DISTS[params.dist] || DISTS.uniform;
    const bins = state.counts.length;
    const width = (HI - LO) / bins;

    // Densities, not counts, so the histogram is comparable to the curve.
    let peak = 0.45;
    if (state.total > 0) {
      for (let i = 0; i < bins; i++) {
        const d = state.counts[i] / (state.total * width);
        if (d > peak) peak = d;
      }
    }
    state.peak += (peak - state.peak) * 0.08;   // eased, so the axis settles

    const plot = createPlot(ctx, env, {
      xDomain: [LO, HI],
      yDomain: [0, state.peak * 1.15],
      labels: state.labels,
    });

    plot.frame({
      xLabel: dist.heavy ? 'sample mean' : 'z = √n (x̄ − μ) / σ',
      yLabel: 'density',
    });

    plot.clip(() => {
      if (state.total > 0) {
        ctx.fillStyle = 'rgba(251,146,60,0.5)';
        ctx.strokeStyle = 'rgba(251,146,60,0.9)';
        ctx.lineWidth = 1;
        for (let i = 0; i < bins; i++) {
          if (!state.counts[i]) continue;
          const d = state.counts[i] / (state.total * width);
          const x0 = plot.xToPx(LO + i * width);
          const x1 = plot.xToPx(LO + (i + 1) * width);
          const y0 = plot.yToPx(0);
          const y1 = plot.yToPx(d);
          ctx.fillRect(x0, y1, Math.max(1, x1 - x0 - 0.5), y0 - y1);
        }
      }

      if (params.showNormal) {
        plot.curve(normalPdf, { color: '#e2e8f0', width: 2 });
      }
      if (params.showCauchy && dist.heavy) {
        plot.curve(cauchyPdf, { color: '#f87171', width: 1.8, dash: [6, 3] });
      }
    });

    const tex = dist.heavy
      ? `\\bar{X}_{${params.n}} \\sim \\mathrm{Cauchy}(0,1)`
        + `\\ \\text{ for every } n \\quad (X_i \\sim ${dist.tex})`
      : `\\sqrt{${params.n}}\\,\\frac{\\bar{X}_{${params.n}} - \\mu}{\\sigma}`
        + `\\ \\Rightarrow\\ \\mathcal{N}(0,1)`
        + `\\quad (X_i \\sim ${dist.tex})`;
    plot.labelPx(plot.left + 10, plot.top + 9, tex, { id: 'clt', anchor: 'top-left' });

    plot.labelPx(plot.right - 10, plot.top + 9,
      `N = ${state.total.toLocaleString('en-US')}`,
      { id: 'count', anchor: 'top-right' });
  },

  stats(state, params) {
    const dist = DISTS[params.dist] || DISTS.uniform;
    const n = state.total;
    const mean = n ? state.sum / n : 0;
    const varr = n > 1 ? state.sumSq / n - mean * mean : 0;

    const out = [
      { label: 'Histogram', color: '#fb923c' },
      { label: 'Normal(0,1)', color: '#e2e8f0' },
    ];
    if (dist.heavy) out.push({ label: 'Cauchy(0,1)', color: '#f87171', dashed: true });

    out.push({ label: 'Means drawn', value: n.toLocaleString('en-US') });
    out.push({ label: 'Empirical mean', value: mean.toFixed(3) });
    out.push({
      label: 'Empirical sd',
      value: varr > 0 ? Math.sqrt(varr).toFixed(3) : '—',
    });
    out.push({
      label: 'Off-scale',
      value: n ? `${((state.outside / n) * 100).toFixed(2)} %` : '—',
    });
    return out;
  },
});
