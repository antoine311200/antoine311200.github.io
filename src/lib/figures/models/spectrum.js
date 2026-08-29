import { defineModel } from '../core/model';
import { createPlot, panelRects } from '../core/plot';
import { gaussian } from '../core/rng';

/**
 * A signal and its spectrum, in two panels.
 *
 * The figure exists to make spectral leakage visible. Put a sinusoid at an
 * exact number of cycles per window and its energy lands in one bin; move it
 * off by half a bin and it smears across the whole spectrum, because the DFT
 * assumes the window repeats forever and a non-integer frequency does not join
 * up at the seam. Switching the window from rectangular to Hann collapses the
 * skirts — at the price of a wider main lobe, which is the trade the figure is
 * really about.
 *
 * Set "Drift" above zero to sweep the frequency and watch the peak slide
 * between bins.
 */

const WINDOWS = {
  rect:     { label: 'Rectangular', w: () => 1 },
  hann:     { label: 'Hann',        w: (n, N) => 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1))) },
  hamming:  { label: 'Hamming',     w: (n, N) => 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (N - 1)) },
  blackman: { label: 'Blackman',    w: (n, N) => 0.42
    - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1))
    + 0.08 * Math.cos((4 * Math.PI * n) / (N - 1)) },
};

/** In-place iterative radix-2 Cooley–Tukey. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const xr = re[i + k + half];
        const xi = im[i + k + half];
        const vr = xr * cr - xi * ci;
        const vi = xr * ci + xi * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + half] = ur - vr;
        im[i + k + half] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/** Build the windowed signal and its magnitude spectrum into `state`. */
function recompute(state, params, rng, t) {
  const N = state.N;
  const win = WINDOWS[params.window] || WINDOWS.rect;
  const f1 = params.f1 + params.drift * Math.sin(0.35 * t);
  const f2 = params.f2;

  for (let n = 0; n < N; n++) {
    const u = (2 * Math.PI * n) / N;
    let v = params.a1 * Math.sin(f1 * u) + params.a2 * Math.sin(f2 * u + 0.7);
    if (params.noise > 0) v += gaussian(rng) * params.noise;
    state.x[n] = v;
    const w = win.w(n, N);
    state.win[n] = w;
    state.re[n] = v * w;
    state.im[n] = 0;
  }

  fft(state.re, state.im);

  let peak = -1;
  let peakBin = 0;
  const half = N / 2;
  for (let k = 0; k < half; k++) {
    const m = (2 * Math.hypot(state.re[k], state.im[k])) / N;
    state.mag[k] = m;
    if (m > peak) { peak = m; peakBin = k; }
  }
  state.peakBin = peakBin;
  state.peak = peak;
  state.f1eff = f1;
}

export default defineModel({
  id: 'spectrum',
  name: 'Signal · DFT and leakage',
  description:
    'A waveform in the upper panel and its magnitude spectrum in the lower one, '
    + 'showing a peak that smears across bins when the frequency is not a whole '
    + 'number of cycles per window.',

  params: [
    { key: 'N', label: 'Window length', tex: 'N', type: 'select', default: 512, reinit: true, group: 'Transform',
      options: [128, 256, 512, 1024].map(v => ({ value: v, label: String(v) })) },
    { key: 'window', label: 'Window', type: 'select', default: 'rect', group: 'Transform',
      options: Object.entries(WINDOWS).map(([value, w]) => ({ value, label: w.label })) },
    { key: 'db', label: 'Decibels', type: 'toggle', default: true, group: 'Transform' },
    { key: 'showWindow', label: 'Show window', type: 'toggle', default: false, group: 'Transform' },

    { key: 'f1', label: 'Frequency 1', tex: 'f_1', min: 1, max: 60, step: 0.25, default: 12, unit: ' cyc', group: 'Signal',
      hint: 'Cycles per window. Whole numbers land in one bin; halves leak.' },
    { key: 'a1', label: 'Amplitude 1', tex: 'A_1', min: 0, max: 1, step: 0.02, default: 1, group: 'Signal' },
    { key: 'f2', label: 'Frequency 2', tex: 'f_2', min: 1, max: 60, step: 0.25, default: 30, unit: ' cyc', group: 'Signal' },
    { key: 'a2', label: 'Amplitude 2', tex: 'A_2', min: 0, max: 1, step: 0.02, default: 0.35, group: 'Signal' },
    { key: 'noise', label: 'Noise', tex: '\\sigma', min: 0, max: 0.5, step: 0.01, default: 0.02, group: 'Signal' },
    { key: 'drift', label: 'Drift', min: 0, max: 3, step: 0.05, default: 0, unit: ' cyc', group: 'Signal',
      hint: 'Sweeps f₁ back and forth so the peak crosses bin boundaries' },
  ],

  presets: [
    { name: 'On a bin',      values: { f1: 12, drift: 0, window: 'rect', a2: 0.35 } },
    { name: 'Half a bin',    values: { f1: 12.5, drift: 0, window: 'rect' } },
    { name: 'Hann fixes it', values: { f1: 12.5, drift: 0, window: 'hann' } },
    { name: 'Sweeping',      values: { f1: 12, drift: 1.5, window: 'rect' } },
    { name: 'Buried in noise', values: { a1: 0.35, a2: 0, noise: 0.4, window: 'hann', db: true } },
  ],

  init(params, rng) {
    const N = params.N;
    const state = {
      N,
      x: new Float64Array(N),
      re: new Float64Array(N),
      im: new Float64Array(N),
      mag: new Float64Array(N / 2),
      win: new Float64Array(N),
      peakBin: 0,
      peak: 0,
      f1eff: params.f1,
    };
    // The engine draws before it steps — a figure that starts paused would
    // otherwise render one frame with nothing computed. Seed it here.
    recompute(state, params, rng, 0);
    return state;
  },

  step(state, params, dt, rng) {
    recompute(state, params, rng, state.time || 0);
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const N = state.N;
    const half = N / 2;
    const [topRect, botRect] = panelRects(env, { rows: 2, ratios: [1, 1.25], gap: 8 });

    // ── Panel 1: the windowed signal ──
    const sig = createPlot(ctx, env, {
      rect: topRect,
      xDomain: [0, N],
      yDomain: [-1.6, 1.6],
      labels: state.labels,
    });
    sig.frame({ xLabel: 'n', yLabel: 'x' });
    sig.clip(() => {
      if (params.showWindow) {
        const pts = [];
        for (let n = 0; n < N; n += 2) pts.push([n, state.win[n] * 1.45]);
        sig.line(pts, { color: '#64748b', width: 1, dash: [4, 3] });
      }
      const pts = [];
      for (let n = 0; n < N; n++) pts.push([n, state.x[n]]);
      sig.line(pts, { color: '#fb923c', width: 1.2 });
    });
    sig.labelPx(sig.left + 10, sig.top + 8,
      `x_n = ${params.a1.toFixed(2)}\\sin\\!\\left(2\\pi ${state.f1eff.toFixed(2)}\\tfrac{n}{N}\\right)`
      + ` + ${params.a2.toFixed(2)}\\sin\\!\\left(2\\pi ${params.f2.toFixed(2)}\\tfrac{n}{N}\\right) + \\varepsilon_n`,
      { id: 'signal', anchor: 'top-left' });

    // ── Panel 2: the magnitude spectrum ──
    const floorDb = -80;
    const spec = createPlot(ctx, env, {
      rect: botRect,
      xDomain: [0, half],
      yDomain: params.db ? [floorDb, 6] : [0, 1.15],
      labels: state.labels,
    });
    spec.frame({ xLabel: 'k  (cycles per window)', yLabel: params.db ? 'dB' : '|X|' });

    spec.clip(() => {
      const base = params.db ? floorDb : 0;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k < half; k++) {
        const m = state.mag[k];
        const v = params.db ? Math.max(floorDb, 20 * Math.log10(m + 1e-12)) : m;
        const px = spec.xToPx(k);
        ctx.moveTo(px, spec.yToPx(base));
        ctx.lineTo(px, spec.yToPx(v));
      }
      ctx.stroke();

      const pk = state.peakBin;
      const pv = params.db
        ? Math.max(floorDb, 20 * Math.log10(state.peak + 1e-12))
        : state.peak;
      spec.dot(pk, pv, { color: '#fdba74', r: 3.4, ring: true });
    });

    spec.labelPx(spec.left + 10, spec.top + 8,
      `X_k = \\sum_{n=0}^{${N - 1}} w_n\\,x_n\\,e^{-2\\pi i kn/${N}}`,
      { id: 'dft', anchor: 'top-left' });
    spec.labelPx(spec.right - 10, spec.top + 8,
      `\\hat{k} = ${state.peakBin}`,
      { id: 'peak', anchor: 'top-right', color: '#fdba74' });
  },

  stats(state, params) {
    const frac = state.f1eff - Math.round(state.f1eff);
    return [
      { label: 'Signal', color: '#fb923c' },
      { label: 'Spectrum', color: '#38bdf8' },
      { label: 'Peak bin', value: state.peakBin },
      { label: 'f₁', value: state.f1eff.toFixed(3) },
      { label: 'Off-bin by', value: `${Math.abs(frac).toFixed(3)} bins` },
      { label: 'Window', value: (WINDOWS[params.window] || WINDOWS.rect).label },
    ];
  },
});
