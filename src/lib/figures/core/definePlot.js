import { defineModel } from './model';
import { createPlot, autoRange } from './plot';

/**
 * Declarative plots: equation + parameters → animated curve.
 *
 * The counterpart to `defineModel` for figures that are a *drawing of a
 * function* rather than a simulation. You give the domain and a list of
 * series; the library handles axes, ticks, animation time, the legend, and
 * the hover readout.
 *
 *   definePlot({
 *     id, name, description,
 *     params, presets,
 *
 *     xDomain: [0, 10] | (params, t) => [a, b],     // sliding windows welcome
 *     yDomain: [-2, 2] | (params, t) => [a, b] | 'auto',
 *     xLabel, yLabel,
 *
 *     series: [{
 *       id, label, tex, color,
 *       dash, width, alpha,
 *       fn: (x, params, t, state) => y,
 *       visible: (params) => boolean,               // optional
 *       readout: true,                              // show value in the legend
 *     }],
 *
 *     // optional extras
 *     state:   (params, rng, env) => ({ ... }),      // extra state
 *     advance: (state, params, dt) => void,          // extra per-step work
 *     decorate:(plot, params, t, state) => void,     // draw on top of the series
 *     legend:  false,                                // suppress the auto legend
 *   })
 *
 * `t` is the engine's simulated time in seconds, so playback speed, pause and
 * single-step all work without the plot knowing about them.
 */

function resolve(value, params, t, fallback) {
  if (typeof value === 'function') return value(params, t);
  if (value === undefined || value === null) return fallback;
  return value;
}

export function definePlot(spec) {
  const seriesOf = params =>
    (spec.series || []).filter(s => (typeof s.visible === 'function' ? s.visible(params) : true));

  return defineModel({
    id: spec.id,
    name: spec.name,
    description: spec.description,
    rate: spec.rate || 60,
    params: spec.params || [],
    presets: spec.presets || [],
    actions: spec.actions || [],
    kind: 'plot',

    init(params, rng, env) {
      const extra = spec.state ? spec.state(params, rng, env) : null;
      return { auto: null, hover: null, ...extra };
    },

    step(state, params, dt) {
      if (spec.advance) spec.advance(state, params, dt);
    },

    clear(ctx, state, params, env) {
      ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
      ctx.fillRect(0, 0, env.width, env.height);
    },

    draw(ctx, state, params, env) {
      const t = state.time || 0;
      const active = seriesOf(params);
      const xDomain = resolve(spec.xDomain, params, t, [0, 1]);

      // y-range: explicit, or measured from the curves and eased into place.
      // Resolved first so a model can decide *per parameter set* whether the
      // axis is fixed or measured (an "auto y-scale" toggle, say).
      let yDomain;
      let ySpec = spec.yDomain;
      if (typeof ySpec === 'function') ySpec = ySpec(params, t);
      if (ySpec === 'auto' || ySpec === undefined) {
        let lo = Infinity;
        let hi = -Infinity;
        const N = 160;
        for (const s of active) {
          for (let i = 0; i <= N; i++) {
            const x = xDomain[0] + ((xDomain[1] - xDomain[0]) * i) / N;
            const y = s.fn(x, params, t, state);
            if (!isFinite(y)) continue;
            if (y < lo) lo = y;
            if (y > hi) hi = y;
          }
        }
        if (lo === Infinity) { lo = -1; hi = 1; }
        yDomain = autoRange(state, 'auto', lo, hi, spec.autoRange || {});
      } else {
        yDomain = ySpec;
      }

      const plot = createPlot(ctx, env, {
        xDomain,
        yDomain,
        padding: spec.padding,
      });

      plot.frame({
        xLabel: resolve(spec.xLabel, params, t, null),
        yLabel: resolve(spec.yLabel, params, t, null),
      });

      plot.clip(() => {
        for (const s of active) {
          plot.curve(x => s.fn(x, params, t, state), {
            color: s.color,
            width: s.width || 1.8,
            dash: s.dash || null,
            alpha: s.alpha == null ? 1 : s.alpha,
            samples: s.samples,
          });
        }
        if (spec.decorate) spec.decorate(plot, params, t, state);
      });

      // Hover readout: a vertical cut through every series.
      const ptr = state.pointer;
      state.hover = null;
      if (ptr && ptr.active && ptr.x >= plot.left && ptr.x <= plot.right) {
        const x = plot.pxToX(ptr.x);
        state.hover = { x, values: [] };
        plot.vline(x);
        plot.clip(() => {
          for (const s of active) {
            const y = s.fn(x, params, t, state);
            if (!isFinite(y)) continue;
            state.hover.values.push({ id: s.id, label: s.label, color: s.color, y });
            plot.dot(x, y, { color: s.color, r: 3, ring: true });
          }
        });
        plot.tag(x, yDomain[1], `x = ${x.toFixed(2)}`, {
          color: plot.theme.muted || '#94a3b8',
          baseline: 'top',
          dy: 4,
        });
      }
    },

    stats(state, params) {
      if (spec.stats) return spec.stats(state, params);
      if (spec.legend === false) return [];
      const hover = state.hover;
      return seriesOf(params).map(s => {
        const hit = hover && hover.values.find(v => v.id === s.id);
        return {
          label: s.label,
          color: s.color,
          dashed: !!s.dash,
          value: hit ? hit.y.toFixed(3) : undefined,
        };
      });
    },
  });
}

export default definePlot;
