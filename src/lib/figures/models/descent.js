import { defineModel } from '../core/model';
import { createPlot } from '../core/plot';
import { gaussian } from '../core/rng';

/**
 * Five optimisers racing over the same loss surface.
 *
 * This is the figure that uses `createPlot` from inside a `defineModel`: it
 * needs real axes *and* a simulation, which is the case the two contracts are
 * meant to compose for. It also exercises the parts of the parameter system
 * the simpler models do not — a `format` for the log-scaled learning rate, a
 * `select` that rebuilds state, one toggle per optimiser, actions, and
 * `onPointer` to drop the starting point anywhere on the surface.
 */

const SURFACES = {
  bowl: {
    label: 'Ill-conditioned bowl',
    tex: 'f(x,y) = \\tfrac{1}{2}\\left(x^{2} + 20\\,y^{2}\\right)',
    dom: [-4, 4, -2.2, 2.2],
    f: (x, y) => 0.5 * (x * x + 20 * y * y),
    g: (x, y) => [x, 20 * y],
    start: [-3.2, 1.6],
    minima: [[0, 0]],
  },
  rosenbrock: {
    label: 'Rosenbrock',
    tex: 'f(x,y) = (1-x)^{2} + 100\\,(y-x^{2})^{2}',
    dom: [-2, 2, -0.8, 3],
    f: (x, y) => { const a = 1 - x, b = y - x * x; return a * a + 100 * b * b; },
    g: (x, y) => { const b = y - x * x; return [-2 * (1 - x) - 400 * x * b, 200 * b]; },
    start: [-1.6, 2.4],
    minima: [[1, 1]],
  },
  himmelblau: {
    label: 'Himmelblau',
    tex: 'f(x,y) = (x^{2}+y-11)^{2} + (x+y^{2}-7)^{2}',
    dom: [-5.5, 5.5, -5.5, 5.5],
    f: (x, y) => { const a = x * x + y - 11, b = x + y * y - 7; return a * a + b * b; },
    g: (x, y) => {
      const a = x * x + y - 11, b = x + y * y - 7;
      return [4 * x * a + 2 * b, 2 * a + 4 * y * b];
    },
    start: [-0.4, -0.3],
    minima: [[3, 2], [-2.805118, 3.131312], [-3.779310, -3.283186], [3.584428, -1.848126]],
  },
  rastrigin: {
    label: 'Rastrigin',
    tex: 'f(x,y) = 20 + \\sum_i \\left(x_i^{2} - 10\\cos 2\\pi x_i\\right)',
    dom: [-5.12, 5.12, -5.12, 5.12],
    f: (x, y) => 20 + (x * x - 10 * Math.cos(2 * Math.PI * x))
      + (y * y - 10 * Math.cos(2 * Math.PI * y)),
    g: (x, y) => [
      2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
      2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y),
    ],
    start: [-4.3, 3.8],
    minima: [[0, 0]],
  },
};

const OPTIMS = [
  { id: 'sgd',      label: 'SGD',      color: '#94a3b8' },
  { id: 'momentum', label: 'Momentum', color: '#38bdf8' },
  { id: 'nesterov', label: 'Nesterov', color: '#a78bfa' },
  { id: 'rmsprop',  label: 'RMSProp',  color: '#34d399' },
  { id: 'adam',     label: 'Adam',     color: '#fb923c' },
];

// Low loss is dark, high loss is light — so the paths, which are bright, read
// as the foreground everywhere on the surface.
const BANDS = [
  '#0a1020', '#0e1529', '#121b33', '#16213d', '#1a2747', '#1e2d51', '#22335b',
  '#273a66', '#2b4070', '#30477a', '#354e85', '#3a558f', '#3f5c99', '#4463a3',
];

const PATH_MAX = 900;

function makeWalker(o, start) {
  return {
    id: o.id, color: o.color, label: o.label,
    x: start[0], y: start[1],
    vx: 0, vy: 0, sx: 0, sy: 0, mx: 0, my: 0, t: 0,
    path: [[start[0], start[1]]],
    loss: 0,
    dead: false,
  };
}

function update(w, g, p) {
  const lr = Math.pow(10, p.logLr);
  const b1 = p.beta1;
  const b2 = p.beta2;
  const eps = 1e-8;

  switch (w.id) {
    case 'sgd':
      w.x -= lr * g[0];
      w.y -= lr * g[1];
      break;
    case 'momentum':
      w.vx = b1 * w.vx + g[0];
      w.vy = b1 * w.vy + g[1];
      w.x -= lr * w.vx;
      w.y -= lr * w.vy;
      break;
    case 'nesterov':
      w.vx = b1 * w.vx + g[0];
      w.vy = b1 * w.vy + g[1];
      w.x -= lr * (g[0] + b1 * w.vx);
      w.y -= lr * (g[1] + b1 * w.vy);
      break;
    case 'rmsprop':
      w.sx = b2 * w.sx + (1 - b2) * g[0] * g[0];
      w.sy = b2 * w.sy + (1 - b2) * g[1] * g[1];
      w.x -= (lr * g[0]) / (Math.sqrt(w.sx) + eps);
      w.y -= (lr * g[1]) / (Math.sqrt(w.sy) + eps);
      break;
    case 'adam': {
      w.t++;
      w.mx = b1 * w.mx + (1 - b1) * g[0];
      w.my = b1 * w.my + (1 - b1) * g[1];
      w.sx = b2 * w.sx + (1 - b2) * g[0] * g[0];
      w.sy = b2 * w.sy + (1 - b2) * g[1] * g[1];
      const mhx = w.mx / (1 - Math.pow(b1, w.t));
      const mhy = w.my / (1 - Math.pow(b1, w.t));
      const vhx = w.sx / (1 - Math.pow(b2, w.t));
      const vhy = w.sy / (1 - Math.pow(b2, w.t));
      w.x -= (lr * mhx) / (Math.sqrt(vhx) + eps);
      w.y -= (lr * mhy) / (Math.sqrt(vhy) + eps);
      break;
    }
    default:
      break;
  }
}

/**
 * The loss surface, as filled cells batched into one Path2D per colour band.
 * Rebuilt only when the surface or the canvas size changes — a few thousand
 * function evaluations, once, rather than every frame.
 */
function buildField(plot, surface) {
  const [xa, xb, ya, yb] = surface.dom;
  const cell = 4;
  const cols = Math.ceil(plot.innerW / cell);
  const rows = Math.ceil(plot.innerH / cell);

  const vals = new Float64Array(cols * rows);
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < rows; j++) {
    const y = yb - ((j + 0.5) / rows) * (yb - ya);
    for (let i = 0; i < cols; i++) {
      const x = xa + ((i + 0.5) / cols) * (xb - xa);
      const v = Math.log1p(Math.max(0, surface.f(x, y)));
      vals[j * cols + i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }

  const paths = BANDS.map(() => new Path2D());
  const span = hi - lo || 1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let b = Math.floor(((vals[j * cols + i] - lo) / span) * BANDS.length);
      if (b < 0) b = 0; else if (b >= BANDS.length) b = BANDS.length - 1;
      paths[b].rect(plot.left + i * cell, plot.top + j * cell, cell + 0.5, cell + 0.5);
    }
  }
  return paths;
}

export default defineModel({
  id: 'gradient-descent',
  name: 'Optimisation · Descent on a loss surface',
  description:
    'A contour map of a loss surface with five coloured paths crawling down it, '
    + 'one per optimiser. Click anywhere on the surface to restart them from there.',

  params: [
    { key: 'surface', label: 'Loss surface', type: 'select', default: 'bowl', reinit: true, group: 'Problem',
      options: Object.entries(SURFACES).map(([value, s]) => ({ value, label: s.label })) },
    { key: 'logLr', label: 'Learning rate', tex: '\\eta', min: -4, max: -0.3, step: 0.05, default: -1.4, group: 'Problem',
      format: v => Math.pow(10, v).toExponential(1),
      hint: 'Logarithmic: the slider is log₁₀ η' },
    { key: 'noise', label: 'Gradient noise', tex: '\\sigma', min: 0, max: 1, step: 0.02, default: 0, group: 'Problem',
      hint: 'Makes it stochastic gradient descent' },
    { key: 'iters', label: 'Steps / frame', min: 1, max: 20, step: 1, default: 2, group: 'Problem' },

    { key: 'beta1', label: 'Momentum', tex: '\\beta_1', min: 0, max: 0.99, step: 0.01, default: 0.9, group: 'Hyper-parameters' },
    { key: 'beta2', label: 'Second moment', tex: '\\beta_2', min: 0.5, max: 0.9999, step: 0.0005, default: 0.999, group: 'Hyper-parameters' },

    { key: 'sgd', label: 'SGD', type: 'toggle', default: true, group: 'Optimisers' },
    { key: 'momentum', label: 'Momentum', type: 'toggle', default: true, group: 'Optimisers' },
    { key: 'nesterov', label: 'Nesterov', type: 'toggle', default: false, group: 'Optimisers' },
    { key: 'rmsprop', label: 'RMSProp', type: 'toggle', default: true, group: 'Optimisers' },
    { key: 'adam', label: 'Adam', type: 'toggle', default: true, group: 'Optimisers' },

    { key: 'field', label: 'Contours', type: 'toggle', default: true, group: 'View' },
    { key: 'paths', label: 'Paths', type: 'toggle', default: true, group: 'View' },
  ],

  presets: [
    { name: 'Ill-conditioned', values: { surface: 'bowl', logLr: -1.4, beta1: 0.9 } },
    { name: 'Rosenbrock valley', values: { surface: 'rosenbrock', logLr: -3.1, beta1: 0.9 } },
    { name: 'Four minima', values: { surface: 'himmelblau', logLr: -2.6, beta1: 0.85 } },
    { name: 'Many local minima', values: { surface: 'rastrigin', logLr: -2.3, noise: 0.3 } },
    { name: 'No momentum', values: { beta1: 0, logLr: -1.6 } },
  ],

  actions: [
    { id: 'restart', label: 'Restart', run(state) { state.restart(state.start); } },
    { id: 'random', label: 'Random start', run(state, params, rng) {
      const s = SURFACES[params.surface] || SURFACES.bowl;
      const [xa, xb, ya, yb] = s.dom;
      state.restart([xa + rng() * (xb - xa), ya + rng() * (yb - ya)]);
    } },
  ],

  // The loss curve is the plot every optimiser paper prints, and it comes from
  // one declaration per optimiser. `visible` keeps a curve out of the strip
  // when its toggle is off, and `log: true` puts it on the usual log axis.
  traces: OPTIMS.map(o => ({
    id: o.id,
    label: o.label,
    color: o.color,
    visible: p => p[o.id],
    value: (state) => {
      const w = state.walkers.find(x => x.id === o.id);
      return w && !w.dead ? Math.max(1e-12, w.loss) : NaN;
    },
  })),
  traceOptions: { height: 0.3, window: 900, log: true, yLabel: 'log₁₀ f', xLabel: 'iterations' },

  init(params) {
    const surface = SURFACES[params.surface] || SURFACES.bowl;
    const state = {
      surfaceId: params.surface,
      start: surface.start.slice(),
      walkers: [],
      field: null,
      fieldKey: '',
      plot: null,
      steps: 0,
    };
    state.restart = (start) => {
      state.start = start.slice();
      state.walkers = OPTIMS.map(o => makeWalker(o, state.start));
      state.steps = 0;
    };
    state.restart(state.start);
    return state;
  },

  step(state, params, dt, rng) {
    const surface = SURFACES[params.surface] || SURFACES.bowl;
    const [xa, xb, ya, yb] = surface.dom;
    const spanX = xb - xa;
    const spanY = yb - ya;

    for (let k = 0; k < params.iters; k++) {
      for (const w of state.walkers) {
        if (!params[w.id] || w.dead) continue;

        const g = surface.g(w.x, w.y);
        if (params.noise > 0) {
          g[0] += gaussian(rng) * params.noise * 2;
          g[1] += gaussian(rng) * params.noise * 2;
        }
        update(w, g, params);

        if (!isFinite(w.x) || !isFinite(w.y)
          || Math.abs(w.x - xa) > 6 * spanX || Math.abs(w.y - ya) > 6 * spanY) {
          w.dead = true;
          continue;
        }
        w.loss = surface.f(w.x, w.y);
        w.path.push([w.x, w.y]);
        if (w.path.length > PATH_MAX) w.path.shift();
      }
      state.steps++;
    }
  },

  /** Click the surface to drop the starting point there. */
  onPointer(state, pointer) {
    const plot = state.plot;
    if (!plot || !pointer.down) return;
    if (pointer.x < plot.left || pointer.x > plot.right) return;
    if (pointer.y < plot.top || pointer.y > plot.bottom) return;
    const [xa, xb] = plot.xDomain;
    const [ya, yb] = plot.yDomain;
    const x = xa + ((pointer.x - plot.left) / plot.innerW) * (xb - xa);
    const y = yb - ((pointer.y - plot.top) / plot.innerH) * (yb - ya);
    state.restart([x, y]);
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const surface = SURFACES[params.surface] || SURFACES.bowl;
    const [xa, xb, ya, yb] = surface.dom;

    const plot = createPlot(ctx, env, {
      xDomain: [xa, xb],
      yDomain: [ya, yb],
      labels: state.labels,
    });
    state.plot = plot;   // onPointer needs the geometry

    const key = `${Math.round(plot.innerW)}x${Math.round(plot.innerH)}|${params.surface}`;
    if (params.field) {
      if (state.fieldKey !== key) {
        state.field = buildField(plot, surface);
        state.fieldKey = key;
      }
      plot.clip(() => {
        for (let i = 0; i < BANDS.length; i++) {
          ctx.fillStyle = BANDS[i];
          ctx.fill(state.field[i]);
        }
      });
    }

    plot.frame({ xLabel: 'x', yLabel: 'y' });

    plot.clip(() => {
      for (const m of surface.minima) {
        plot.dot(m[0], m[1], { color: '#f8fafc', r: 3.2, ring: true });
      }
      plot.dot(state.start[0], state.start[1], { color: '#64748b', r: 3 });

      for (const w of state.walkers) {
        if (!params[w.id]) continue;
        if (params.paths && w.path.length > 1) {
          plot.line(w.path, { color: w.color, width: 1.4, alpha: w.dead ? 0.3 : 0.85 });
        }
        if (!w.dead) plot.dot(w.x, w.y, { color: w.color, r: 3.4, ring: true });
      }
    });

    plot.labelPx(plot.left + 10, plot.top + 9, surface.tex, { id: 'surface', anchor: 'top-left' });
    plot.labelPx(plot.right - 10, plot.top + 9,
      `\\eta = ${Math.pow(10, params.logLr).toExponential(1)}`
      + `\\quad \\beta_1 = ${params.beta1.toFixed(2)}`
      + `\\quad \\beta_2 = ${params.beta2.toFixed(3)}`,
      { id: 'hyper', anchor: 'top-right' });
  },

  stats(state, params) {
    const out = [{ label: 'Steps', value: state.steps }];
    for (const w of state.walkers) {
      if (!params[w.id]) continue;
      out.push({
        label: w.label,
        color: w.color,
        value: w.dead ? 'diverged' : w.loss.toExponential(2),
      });
    }
    return out;
  },
});
