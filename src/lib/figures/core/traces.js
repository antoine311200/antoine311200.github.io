import { createPlot } from './plot';

/**
 * Live metric traces under a simulation.
 *
 * Any `defineModel` can declare quantities to record and the library reserves a
 * strip under the main view, samples them as the simulation steps, and plots
 * them — no ring buffers, no second panel, no plumbing in the model:
 *
 *   traces: [
 *     { id: 'order', label: 'order', tex: '\\varphi', color: '#fb923c',
 *       value: (state, params) => state.order },
 *   ],
 *   traceOptions: { height: 0.26, window: 600, range: [0, 1] },
 *
 * The model keeps drawing as if it owned the whole canvas: the wrapper shrinks
 * `env.height` and `state.height` for the duration of every `sync`, `step`,
 * `draw` and `onPointer` call, and clips drawing to the region it was given.
 * That is what makes this work for models written before the feature existed.
 *
 * Samples are taken per simulation *step*, not per frame, so a trace is
 * unaffected by frame rate and honours pause, single-step and playback speed.
 */

const DEFAULTS = {
  height: 0.26,      // fraction of the canvas given to the strip
  gap: 8,
  window: 600,       // samples retained
  sampleEvery: 1,    // steps per sample
  range: 'auto',
  log: false,
};

const isShown = (t, params) => (typeof t.visible === 'function' ? t.visible(params) : true);

export function withTraces(def) {
  const traces = def.traces;
  const o = { ...DEFAULTS, ...(def.traceOptions || {}) };
  const N = Math.max(32, o.window);
  const every = Math.max(1, o.sampleEvery);
  const frac = Math.min(0.55, Math.max(0.1, o.height));

  /** Split a canvas height into the model's region and the strip's. */
  function split(h) {
    const strip = Math.max(46, Math.round(h * frac));
    return { strip, main: Math.max(40, h - strip - o.gap) };
  }

  /** Run `fn` with the state pretending the canvas is only the main region. */
  function inMain(state, fn) {
    const full = state.height;
    const { main } = split(full);
    state.height = main;
    try {
      return fn(main, full);
    } finally {
      state.height = full;
    }
  }

  const wrapped = { ...def };

  wrapped.init = (params, rng, env) => {
    const { main } = split(env.height);
    const state = def.init(params, rng, { ...env, height: main });
    state.__tr = {
      bufs: traces.map(() => new Float64Array(N)),
      n: 0,
      steps: 0,
      range: null,
    };
    return state;
  };

  if (def.sync) {
    wrapped.sync = (state, params, rng, env) => inMain(state, main =>
      def.sync(state, params, rng, { ...env, height: main }));
  }

  wrapped.step = (state, params, dt, rng) => {
    inMain(state, () => def.step(state, params, dt, rng));

    const tr = state.__tr;
    tr.steps++;
    if (tr.steps % every) return;
    const slot = tr.n % N;
    for (let i = 0; i < traces.length; i++) {
      const v = traces[i].value(state, params);
      tr.bufs[i][slot] = typeof v === 'number' && isFinite(v) ? v : NaN;
    }
    tr.n++;
  };

  if (def.onPointer) {
    wrapped.onPointer = (state, pointer, params, rng) => {
      const { main } = split(state.height);
      if (pointer.y > main) return;          // the strip is not the model's
      inMain(state, () => def.onPointer(state, pointer, params, rng));
    };
  }

  wrapped.draw = (ctx, state, params, env) => {
    const { main, strip } = split(env.height);

    inMain(state, () => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, env.width, main);
      ctx.clip();
      def.draw(ctx, state, params, { ...env, height: main });
      ctx.restore();
    });

    drawStrip(ctx, state, params, env, main, strip);
  };

  function drawStrip(ctx, state, params, env, main, strip) {
    const tr = state.__tr;
    const active = traces
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => isShown(t, params));
    if (!active.length) return;

    const rect = { x: 0, y: main + o.gap, w: env.width, h: strip };
    const theme = env.theme || {};

    // Opaque, so a model that paints trails does not wash over the strip.
    ctx.fillStyle = theme.bg || '#0b1121';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    const count = Math.min(tr.n, N);
    const start = tr.n > N ? tr.n - N : 0;
    const val = (buf, k) => {
      const v = buf[(start + k) % N];
      return o.log ? Math.log10(Math.max(1e-12, v)) : v;
    };

    // Range: fixed if asked, otherwise measured and eased so it stops twitching.
    let lo;
    let hi;
    if (Array.isArray(o.range)) {
      [lo, hi] = o.range;
    } else {
      lo = Infinity;
      hi = -Infinity;
      for (const { i } of active) {
        const buf = tr.bufs[i];
        for (let k = 0; k < count; k++) {
          const v = val(buf, k);
          if (!isFinite(v)) continue;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
      if (lo === Infinity) { lo = 0; hi = 1; }
      const pad = (hi - lo) * 0.12 || 0.5;
      lo -= pad;
      hi += pad;
      const prev = tr.range;
      tr.range = prev
        ? [prev[0] + (lo - prev[0]) * 0.1, prev[1] + (hi - prev[1]) * 0.1]
        : [lo, hi];
      [lo, hi] = tr.range;
    }

    const plot = createPlot(ctx, env, {
      rect,
      xDomain: [0, N],
      yDomain: [lo, hi],
      padding: { top: 8, right: 18, bottom: 20, left: 48 },
      labels: state.labels,
    });
    plot.frame({
      xLabel: o.xLabel === undefined ? 'steps' : o.xLabel,
      yLabel: o.yLabel || (o.log ? 'log₁₀' : undefined),
    });

    plot.clip(() => {
      for (const { t, i } of active) {
        const buf = tr.bufs[i];
        const pts = [];
        for (let k = 0; k < count; k++) {
          const v = val(buf, k);
          if (isFinite(v)) pts.push([k, v]);
        }
        plot.line(pts, { color: t.color, width: t.width || 1.4, dash: t.dash || null });
      }
    });

    // Name each line at its right-hand end, the way definePlot does.
    for (const { t, i } of active) {
      if (!t.tex && !t.label) continue;
      if (count < 2) continue;
      const v = val(tr.bufs[i], count - 1);
      if (!isFinite(v) || v < lo || v > hi) continue;
      plot.label(count, v, t.tex || `\\text{${t.label}}`, {
        id: `trace-${t.id}`,
        anchor: 'right',
        dx: -6,
        color: t.color,
        size: 12,
      });
    }
  }

  return wrapped;
}

export default withTraces;
