import { defineModel } from '../core/model';
import { createPlot, panelRects } from '../core/plot';

/**
 * Phase portraits of planar systems.
 *
 * Two panels in one figure: the phase plane on the left, and the time series of
 * the most recent trajectory on the right — the two views of the same solution
 * that a textbook prints side by side and then asks you to relate. Click the
 * plane to launch a trajectory and both update together.
 *
 * This is also the model that uses conditional controls: each system has its
 * own parameters, and a spec's `visible` hides the ones that do not apply.
 */

const SYSTEMS = {
  vanderpol: {
    label: 'Van der Pol',
    dom: [-4.2, 4.2, -5, 5],
    uses: ['mu'],
    f: (x, y, p) => [y, p.mu * (1 - x * x) * y - x],
    tex: p => `\\dot{x} = y, \\quad \\dot{y} = ${p.mu.toFixed(2)}\\,(1-x^{2})\\,y - x`,
    seeds: [[0.15, 0.15], [3.6, 3.6], [-3.6, -3.6]],
    axes: ['x', 'y'],
  },
  predator: {
    label: 'Lotka–Volterra',
    dom: [0, 4.5, 0, 4.5],
    uses: ['alpha', 'beta', 'gamma', 'delta'],
    f: (x, y, p) => [p.alpha * x - p.beta * x * y, p.delta * x * y - p.gamma * y],
    tex: p => `\\dot{x} = ${p.alpha.toFixed(1)}x - ${p.beta.toFixed(1)}xy,`
      + `\\quad \\dot{y} = ${p.delta.toFixed(1)}xy - ${p.gamma.toFixed(1)}y`,
    seeds: [[1, 1], [2, 1], [3, 1]],
    axes: ['prey', 'predator'],
  },
  pendulum: {
    label: 'Damped pendulum',
    dom: [-7, 7, -4, 4],
    uses: ['damping'],
    f: (x, y, p) => [y, -Math.sin(x) - p.damping * y],
    tex: p => `\\dot{\\theta} = \\omega, \\quad`
      + `\\dot{\\omega} = -\\sin\\theta - ${p.damping.toFixed(2)}\\,\\omega`,
    seeds: [[-6, 1.2], [0, 2.6], [2, -2.2]],
    axes: ['θ', 'ω'],
  },
  linear: {
    label: 'Linear system',
    dom: [-3, 3, -3, 3],
    uses: ['a11', 'a12', 'a21', 'a22'],
    f: (x, y, p) => [p.a11 * x + p.a12 * y, p.a21 * x + p.a22 * y],
    tex: p => '\\dot{\\mathbf{x}} = \\begin{pmatrix}'
      + `${p.a11.toFixed(1)} & ${p.a12.toFixed(1)} \\\\`
      + `${p.a21.toFixed(1)} & ${p.a22.toFixed(1)}`
      + '\\end{pmatrix}\\mathbf{x}',
    seeds: [[2.4, 2.4], [-2.4, 2.4], [2.4, -2.4], [-2.4, -2.4]],
    axes: ['x', 'y'],
  },
};

const MAX_TRAJ = 10;
const MAX_PTS = 1400;
const HUES = [28, 200, 280, 150, 330, 60, 190, 250, 100, 10];

function rk4(x, y, p, sys, h) {
  const k1 = sys.f(x, y, p);
  const k2 = sys.f(x + (h / 2) * k1[0], y + (h / 2) * k1[1], p);
  const k3 = sys.f(x + (h / 2) * k2[0], y + (h / 2) * k2[1], p);
  const k4 = sys.f(x + h * k3[0], y + h * k3[1], p);
  return [
    x + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    y + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
  ];
}

function launch(state, x, y) {
  state.trajs.push({
    x, y, t: 0,
    pts: [[x, y]],
    ts: [[0, x, y]],
    hue: HUES[state.launched % HUES.length],
    dead: false,
  });
  state.launched++;
  if (state.trajs.length > MAX_TRAJ) state.trajs.shift();
}

const usedBy = key => p => (SYSTEMS[p.system] || SYSTEMS.vanderpol).uses.indexOf(key) !== -1;

export default defineModel({
  id: 'phase-portrait',
  name: 'Dynamics · Phase portrait',
  description:
    'A vector field of small arrows with coloured trajectories curling through it, '
    + 'beside a plot of the same trajectory against time. Click the field to launch one.',

  params: [
    { key: 'system', label: 'System', type: 'select', default: 'vanderpol', reinit: true, group: 'System',
      options: Object.entries(SYSTEMS).map(([value, s]) => ({ value, label: s.label })) },

    { key: 'mu', label: 'Nonlinearity', tex: '\\mu', min: 0, max: 4, step: 0.05, default: 1, group: 'System',
      visible: usedBy('mu') },
    { key: 'damping', label: 'Damping', tex: 'c', min: 0, max: 1.2, step: 0.02, default: 0.2, group: 'System',
      visible: usedBy('damping') },
    { key: 'alpha', label: 'Prey growth', tex: '\\alpha', min: 0.2, max: 3, step: 0.1, default: 1.1, group: 'System',
      visible: usedBy('alpha') },
    { key: 'beta', label: 'Predation', tex: '\\beta', min: 0.2, max: 3, step: 0.1, default: 0.9, group: 'System',
      visible: usedBy('beta') },
    { key: 'gamma', label: 'Predator death', tex: '\\gamma', min: 0.2, max: 3, step: 0.1, default: 1.2, group: 'System',
      visible: usedBy('gamma') },
    { key: 'delta', label: 'Conversion', tex: '\\delta', min: 0.2, max: 3, step: 0.1, default: 0.8, group: 'System',
      visible: usedBy('delta') },
    { key: 'a11', label: 'a₁₁', min: -3, max: 3, step: 0.1, default: 0.4, group: 'System', visible: usedBy('a11') },
    { key: 'a12', label: 'a₁₂', min: -3, max: 3, step: 0.1, default: -1.6, group: 'System', visible: usedBy('a12') },
    { key: 'a21', label: 'a₂₁', min: -3, max: 3, step: 0.1, default: 1.6, group: 'System', visible: usedBy('a21') },
    { key: 'a22', label: 'a₂₂', min: -3, max: 3, step: 0.1, default: -0.3, group: 'System', visible: usedBy('a22') },

    { key: 'timeScale', label: 'Time scale', min: 0.1, max: 3, step: 0.05, default: 1, group: 'View' },
    { key: 'window', label: 'Series window', min: 4, max: 60, step: 1, default: 20, unit: ' s', group: 'View' },
    { key: 'field', label: 'Vector field', type: 'toggle', default: true, group: 'View' },
    { key: 'nullclines', label: 'Nullclines', type: 'toggle', default: true, group: 'View' },
  ],

  presets: [
    { name: 'Limit cycle',   values: { system: 'vanderpol', mu: 1 } },
    { name: 'Relaxation',    values: { system: 'vanderpol', mu: 3.4 } },
    { name: 'Predator–prey', values: { system: 'predator' } },
    { name: 'Pendulum',      values: { system: 'pendulum', damping: 0.2 } },
    { name: 'Spiral sink',   values: { system: 'linear', a11: -0.4, a12: -1.6, a21: 1.6, a22: -0.3 } },
    { name: 'Saddle',        values: { system: 'linear', a11: 1, a12: 0.6, a21: 0.6, a22: -1 } },
  ],

  actions: [
    { id: 'clear', label: 'Clear', run(state) { state.trajs = []; } },
    { id: 'seed', label: 'Seed', run(state, params) {
      const sys = SYSTEMS[params.system] || SYSTEMS.vanderpol;
      for (const s of sys.seeds) launch(state, s[0], s[1]);
    } },
  ],

  init(params) {
    const sys = SYSTEMS[params.system] || SYSTEMS.vanderpol;
    const state = { trajs: [], launched: 0, panels: null };
    for (const s of sys.seeds) launch(state, s[0], s[1]);
    return state;
  },

  step(state, params, dt) {
    const sys = SYSTEMS[params.system] || SYSTEMS.vanderpol;
    const [xa, xb, ya, yb] = sys.dom;
    const h = dt * params.timeScale;

    for (const tr of state.trajs) {
      if (tr.dead) continue;
      const [nx, ny] = rk4(tr.x, tr.y, params, sys, h);
      if (!isFinite(nx) || !isFinite(ny)
        || nx < xa - 6 || nx > xb + 6 || ny < ya - 6 || ny > yb + 6) {
        tr.dead = true;
        continue;
      }
      tr.x = nx;
      tr.y = ny;
      tr.t += h;
      tr.pts.push([nx, ny]);
      tr.ts.push([tr.t, nx, ny]);
      if (tr.pts.length > MAX_PTS) tr.pts.shift();
      if (tr.ts.length > MAX_PTS) tr.ts.shift();
    }
  },

  /** Click anywhere in the phase plane to launch a trajectory from there. */
  onPointer(state, pointer) {
    const plot = state.panels && state.panels[0];
    if (!plot || !pointer.down) return;
    if (pointer.x < plot.left || pointer.x > plot.right) return;
    if (pointer.y < plot.top || pointer.y > plot.bottom) return;
    const [xa, xb] = plot.xDomain;
    const [ya, yb] = plot.yDomain;
    launch(
      state,
      xa + ((pointer.x - plot.left) / plot.innerW) * (xb - xa),
      yb - ((pointer.y - plot.top) / plot.innerH) * (yb - ya)
    );
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const sys = SYSTEMS[params.system] || SYSTEMS.vanderpol;
    const [xa, xb, ya, yb] = sys.dom;
    const [leftRect, rightRect] = panelRects(env, { rows: 1, cols: 2, colRatios: [1.25, 1], gap: 10 });

    // ── Panel 1: the phase plane ──
    const plot = createPlot(ctx, env, {
      rect: leftRect,
      xDomain: [xa, xb],
      yDomain: [ya, yb],
      labels: state.labels,
    });

    if (params.field) {
      plot.clip(() => {
        const step = 26;
        ctx.lineWidth = 1;
        for (let px = plot.left + step / 2; px < plot.right; px += step) {
          for (let py = plot.top + step / 2; py < plot.bottom; py += step) {
            const x = xa + ((px - plot.left) / plot.innerW) * (xb - xa);
            const y = yb - ((py - plot.top) / plot.innerH) * (yb - ya);
            const [u, v] = sys.f(x, y, params);
            const m = Math.hypot(u, v);
            if (!isFinite(m) || m < 1e-9) continue;
            const L = step * 0.42;
            const dx = (u / m) * L;
            const dy = -(v / m) * L;
            ctx.strokeStyle = `hsla(200, 60%, 62%, ${Math.min(0.6, 0.12 + m * 0.07)})`;
            ctx.beginPath();
            ctx.moveTo(px - dx / 2, py - dy / 2);
            ctx.lineTo(px + dx / 2, py + dy / 2);
            ctx.stroke();
            ctx.fillStyle = `hsla(200, 70%, 70%, ${Math.min(0.7, 0.2 + m * 0.07)})`;
            ctx.beginPath();
            ctx.arc(px + dx / 2, py + dy / 2, 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    if (params.nullclines) {
      // Where each component changes sign along a row or column: a cheap and
      // honest way to sketch the two nullclines without marching squares.
      plot.clip(() => {
        const N = 130;
        const mark = (which, colour) => {
          ctx.fillStyle = colour;
          for (let j = 0; j <= N; j++) {
            const y = ya + ((yb - ya) * j) / N;
            let prev = sys.f(xa, y, params)[which];
            for (let i = 1; i <= N; i++) {
              const x = xa + ((xb - xa) * i) / N;
              const cur = sys.f(x, y, params)[which];
              if (isFinite(prev) && isFinite(cur) && prev * cur < 0) {
                ctx.fillRect(plot.xToPx(x) - 0.75, plot.yToPx(y) - 0.75, 1.5, 1.5);
              }
              prev = cur;
            }
          }
        };
        mark(0, 'rgba(248,113,113,0.55)');   // ẋ = 0
        mark(1, 'rgba(52,211,153,0.55)');    // ẏ = 0
      });
    }

    plot.frame({ xLabel: sys.axes[0], yLabel: sys.axes[1] });

    plot.clip(() => {
      for (const tr of state.trajs) {
        plot.line(tr.pts, {
          color: `hsl(${tr.hue}, 75%, 64%)`,
          width: 1.5,
          alpha: tr.dead ? 0.3 : 0.9,
        });
        if (!tr.dead) {
          plot.dot(tr.x, tr.y, { color: `hsl(${tr.hue}, 85%, 70%)`, r: 3.2, ring: true });
        }
      }
    });

    plot.labelPx(plot.left + 10, plot.top + 9, sys.tex(params), { id: 'system', anchor: 'top-left' });

    // ── Panel 2: the newest trajectory against time ──
    const last = state.trajs[state.trajs.length - 1];
    const tNow = last ? last.t : 0;
    const t0 = Math.max(0, tNow - params.window);

    const series = createPlot(ctx, env, {
      rect: rightRect,
      xDomain: [t0, Math.max(params.window, tNow)],
      yDomain: [ya, yb],
      labels: state.labels,
    });
    series.frame({ xLabel: 't' });

    if (last) {
      const xs = [];
      const ys = [];
      for (const [t, x, y] of last.ts) {
        if (t < t0) continue;
        xs.push([t, x]);
        ys.push([t, y]);
      }
      series.clip(() => {
        series.line(xs, { color: '#fb923c', width: 1.6 });
        series.line(ys, { color: '#38bdf8', width: 1.6, dash: [5, 3] });
      });
      series.labelPx(series.left + 8, series.top + 9,
        `\\textcolor{#fb923c}{\\text{${sys.axes[0]}}(t)},`
        + `\\ \\textcolor{#38bdf8}{\\text{${sys.axes[1]}}(t)}`,
        { id: 'series', anchor: 'top-left' });
    }

    state.panels = [plot, series];
  },

  stats(state, params) {
    const sys = SYSTEMS[params.system] || SYSTEMS.vanderpol;
    const last = state.trajs[state.trajs.length - 1];
    const out = [
      { label: sys.axes[0], color: '#fb923c' },
      { label: sys.axes[1], color: '#38bdf8', dashed: true },
      { label: 'ẋ = 0', color: 'rgba(248,113,113,0.9)' },
      { label: 'ẏ = 0', color: 'rgba(52,211,153,0.9)' },
      { label: 'Trajectories', value: state.trajs.length },
    ];
    if (last) {
      out.push({ label: 'Latest', value: `(${last.x.toFixed(2)}, ${last.y.toFixed(2)})` });
      out.push({ label: 'age', value: `${last.t.toFixed(1)} s` });
    }
    return out;
  },
});
