import { definePlot } from '../core/definePlot';

/**
 * Fourier series — a partial sum converging on a discontinuous target.
 *
 * The figure exists to make two things visible that a static plot cannot:
 * how quickly each waveform converges as terms are added, and the Gibbs
 * overshoot, which does *not* shrink with N — it narrows but keeps its ~9%
 * height forever.
 */

const TAU = Math.PI * 2;

const WAVES = {
  square: {
    label: 'Square',
    target: u => Math.sign(Math.sin(u)) || 0,
    /** (4/π) Σ_{k odd} sin(kx)/k */
    term: (u, k) => (k % 2 === 1 ? (4 / Math.PI) * Math.sin(k * u) / k : 0),
    uses: k => k % 2 === 1,
    tex: N => `\\frac{4}{\\pi}\\sum_{k\\ \\mathrm{odd}}^{${N}}\\frac{\\sin kx}{k}`,
    discontinuous: true,
  },
  saw: {
    label: 'Sawtooth',
    target: (u) => {
      const m = ((u + Math.PI) % TAU + TAU) % TAU - Math.PI;
      return m / Math.PI;
    },
    /** (2/π) Σ_k (−1)^{k+1} sin(kx)/k */
    term: (u, k) => (2 / Math.PI) * (k % 2 === 1 ? 1 : -1) * Math.sin(k * u) / k,
    uses: () => true,
    tex: N => `\\frac{2}{\\pi}\\sum_{k=1}^{${N}}\\frac{(-1)^{k+1}}{k}\\sin kx`,
    discontinuous: true,
  },
  triangle: {
    label: 'Triangle',
    target: u => (2 / Math.PI) * Math.asin(Math.sin(u)),
    /** (8/π²) Σ_{k odd} (−1)^{(k−1)/2} sin(kx)/k² */
    term: (u, k) => {
      if (k % 2 === 0) return 0;
      const m = (k - 1) / 2;
      return (8 / (Math.PI * Math.PI)) * (m % 2 === 0 ? 1 : -1) * Math.sin(k * u) / (k * k);
    },
    uses: k => k % 2 === 1,
    tex: N => `\\frac{8}{\\pi^{2}}\\sum_{k\\ \\mathrm{odd}}^{${N}}\\frac{(-1)^{(k-1)/2}}{k^{2}}\\sin kx`,
    discontinuous: false,
  },
};

function partialSum(u, p) {
  const wave = WAVES[p.wave] || WAVES.square;
  let s = 0;
  for (let k = 1; k <= p.terms; k++) s += wave.term(u, k);
  return s;
}

/** Terms that actually contribute (odd-only series waste half of N). */
function activeTerms(p) {
  const wave = WAVES[p.wave] || WAVES.square;
  let n = 0;
  for (let k = 1; k <= p.terms; k++) if (wave.uses(k)) n++;
  return n;
}

export default definePlot({
  id: 'fourier-series',
  name: 'Fourier · Partial sums',
  description:
    'A Fourier partial sum converging on a square, sawtooth or triangle wave, '
    + 'with the individual harmonics drawn faintly underneath.',

  params: [
    { key: 'wave', label: 'Target', type: 'select', default: 'square', group: 'Series',
      options: Object.entries(WAVES).map(([value, w]) => ({ value, label: w.label })) },
    { key: 'terms', label: 'Terms', tex: 'N', min: 1, max: 81, step: 1, default: 7, group: 'Series' },
    { key: 'travel', label: 'Travel', min: 0, max: 2, step: 0.05, default: 0.35, unit: ' rad/s', group: 'Series',
      hint: 'Shifts the wave so convergence is visible in motion' },

    { key: 'showTarget', label: 'Target', type: 'toggle', default: true, group: 'View' },
    { key: 'showHarmonics', label: 'Harmonics', type: 'toggle', default: true, group: 'View' },
    { key: 'showError', label: 'Error', type: 'toggle', default: false, group: 'View' },
  ],

  presets: [
    { name: 'One term',   values: { terms: 1, wave: 'square' } },
    { name: 'Gibbs',      values: { terms: 41, wave: 'square', showHarmonics: false } },
    { name: 'Sawtooth',   values: { terms: 15, wave: 'saw' } },
    { name: 'Triangle',   values: { terms: 5, wave: 'triangle' } },
    { name: 'Error view', values: { terms: 11, showError: true, showHarmonics: false } },
  ],

  xLabel: 'x',
  yLabel: 'f(x)',
  xDomain: [-Math.PI, 3 * Math.PI],
  yDomain: [-1.45, 1.45],

  // The partial sum actually being drawn, N substituted live.
  equation: (p) => {
    const wave = WAVES[p.wave] || WAVES.square;
    return `S_{${p.terms}}(x) = ${wave.tex(p.terms)}`;
  },

  series: [
    {
      id: 'target', label: 'Target', tex: 'f(x)',
      color: '#64748b', dash: [5, 4], width: 1.3,
      visible: p => p.showTarget,
      fn: (x, p, t) => (WAVES[p.wave] || WAVES.square).target(x - p.travel * t),
    },
    {
      id: 'error', label: 'Error ×3', tex: '3(S_N - f)',
      color: '#f87171', width: 1.1,
      visible: p => p.showError,
      fn: (x, p, t) => {
        const u = x - p.travel * t;
        const wave = WAVES[p.wave] || WAVES.square;
        return 3 * (partialSum(u, p) - wave.target(u));
      },
    },
    {
      id: 'sum', label: 'Partial sum', tex: 'S_N(x)',
      color: '#fb923c', width: 2,
      fn: (x, p, t) => partialSum(x - p.travel * t, p),
      samples: 1400,     // Gibbs is a narrow spike; undersampling hides it
    },
  ],

  hoverTex: (x, values) => {
    const hit = values.find(v => v.id === 'sum');
    return hit ? `S_N(${x.toFixed(2)}) = ${hit.y.toFixed(3)}` : `x = ${x.toFixed(2)}`;
  },

  /** The individual harmonics, faintly, beneath the sum. */
  decorate(plot, p, t) {
    if (!p.showHarmonics) return;
    const wave = WAVES[p.wave] || WAVES.square;
    let drawn = 0;
    for (let k = 1; k <= p.terms && drawn < 24; k++) {
      if (!wave.uses(k)) continue;
      drawn++;
      const hue = 190 + ((k * 37) % 150);
      plot.curve(x => wave.term(x - p.travel * t, k), {
        color: `hsl(${hue}, 70%, 62%)`,
        width: 1,
        alpha: 0.28,
        samples: 420,
      });
    }
  },

  stats(state, p) {
    const wave = WAVES[p.wave] || WAVES.square;

    // Peak of the partial sum, sampled densely near a discontinuity.
    let peak = 0;
    const N = 2400;
    for (let i = 0; i <= N; i++) {
      const u = -Math.PI + (TAU * i) / N;
      const v = Math.abs(partialSum(u, p));
      if (v > peak) peak = v;
    }
    const overshoot = (peak - 1) * 100;

    const out = [
      { label: 'Partial sum', color: '#fb923c' },
      { label: 'Target', color: '#64748b', dashed: true },
      { label: 'Non-zero terms', value: activeTerms(p) },
      { label: 'Peak', value: peak.toFixed(4) },
    ];
    if (wave.discontinuous) {
      out.push({ label: 'Overshoot', value: `${overshoot.toFixed(2)} %` });
    }
    if (state.hover) {
      const hit = state.hover.values.find(v => v.id === 'sum');
      if (hit) out.push({ label: `S_N(${state.hover.x.toFixed(2)})`, value: hit.y.toFixed(3) });
    }
    return out;
  },
});
