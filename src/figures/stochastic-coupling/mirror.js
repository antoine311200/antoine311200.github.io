import { defineModel, createPlot, gaussian } from '../../lib/figures';

/**
 * The reflection coupling in the plane, drawn as geometry.
 *
 * With e the unit vector along X − Y, the second copy is driven by
 *
 *   dW̃ = (I - 2 e eᵀ) dW,
 *
 * an orthogonal matrix, so W̃ is again a Brownian motion. The component of the
 * noise across e is shared and the component along it is negated: the two
 * paths drift sideways together and disagree only along the gap. The dashed
 * line is the mirror — the perpendicular bisector of XY — and the two arrows
 * are the noise directions, which are mirror images in it.
 *
 * The arrows are drawn at a fixed length, along a smoothed direction. Drawing
 * the increment itself is useless twice over: at this timestep it is a hundred
 * times shorter than the frame, so scaling it up to be visible makes it longer
 * than the frame, and white noise redrawn 60 times a second is a strobe rather
 * than a picture. Length carries no information here anyway — a reflection is
 * an isometry, so the two arrows always have the same length whatever it is.
 */

const HIST = 1500;
const SIGMA = 0.8;
const ARROW = 0.26;     // arrow length, as a fraction of the visible radius
const SMOOTH = 0.1;     // how fast the drawn direction follows the noise

function reflect(dx, dy, ex, ey) {
  const d = 2 * (dx * ex + dy * ey);
  return [dx - d * ex, dy - d * ey];
}

export default defineModel({
  id: 'sc-mirror',
  name: 'Reflection coupling in the plane',
  description:
    'Two wandering points in the plane, orange and blue, with the mirror line '
    + 'between them and their two noise arrows, until they meet and continue as one.',

  zoom: { max: 6 },

  params: [
    { key: 'coupling', label: 'Coupling', type: 'select', default: 'reflection', reinit: true,
      options: [
        { value: 'reflection', label: 'Reflection (mirror)' },
        { value: 'synchronous', label: 'Synchronous' },
      ] },
  ],

  init() {
    return {
      x: [1.2, 0], y: [-1.2, 0], t: 0,
      hx: [[1.2, 0]], hy: [[-1.2, 0]],
      coupled: false, tau: null, noise: null, dir: [0, 0], view: 3,
    };
  },

  step(state, params, dt, rng) {
    const root = Math.sqrt(dt) * SIGMA;
    const dwx = gaussian(rng) * root;
    const dwy = gaussian(rng) * root;

    let ex = state.x[0] - state.y[0];
    let ey = state.x[1] - state.y[1];
    const gap = Math.hypot(ex, ey);
    if (gap > 1e-12) { ex /= gap; ey /= gap; } else { ex = 1; ey = 0; }

    let dvx = dwx;
    let dvy = dwy;
    if (!state.coupled && params.coupling === 'reflection') {
      [dvx, dvy] = reflect(dwx, dwy, ex, ey);
    }
    state.noise = { dwx, dwy, dvx, dvy, ex, ey };
    // What the arrow follows: the increment, low-passed so the eye can track it.
    state.dir[0] += (dwx - state.dir[0]) * SMOOTH;
    state.dir[1] += (dwy - state.dir[1]) * SMOOTH;

    state.x[0] += dwx; state.x[1] += dwy;
    state.y[0] += dvx; state.y[1] += dvy;
    state.t += dt;

    if (!state.coupled && params.coupling === 'reflection') {
      // Under reflection the gap is a one-dimensional Brownian motion along e,
      // so meeting shows up as a crossing rather than an exact hit.
      const along = (state.x[0] - state.y[0]) * ex + (state.x[1] - state.y[1]) * ey;
      if (along <= 0 || Math.hypot(state.x[0] - state.y[0], state.x[1] - state.y[1]) < root) {
        state.coupled = true;
        state.tau = state.t;
        state.y = [state.x[0], state.x[1]];
      }
    }

    state.hx.push([state.x[0], state.x[1]]);
    state.hy.push([state.y[0], state.y[1]]);
    if (state.hx.length > HIST) { state.hx.shift(); state.hy.shift(); }
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    let reach = 1.6;
    for (const [px, py] of state.hx) reach = Math.max(reach, Math.abs(px), Math.abs(py));
    for (const [px, py] of state.hy) reach = Math.max(reach, Math.abs(px), Math.abs(py));
    state.view += (reach * 1.2 - state.view) * 0.03;
    const R = state.view;

    const side = Math.min(env.width, env.height);
    const plot = createPlot(ctx, env, {
      rect: { x: (env.width - side) / 2, y: 0, w: side, h: env.height },
      xDomain: [-R, R],
      yDomain: [-R, R],
      labels: state.labels,
    });
    plot.frame({});

    plot.clip(() => {
      plot.line(state.hy, { color: '#38bdf8', width: 1.1, alpha: 0.7 });
      plot.line(state.hx, { color: '#fb923c', width: 1.1, alpha: 0.7 });

      const n = state.noise;
      if (n && !state.coupled) {
        if (params.coupling === 'reflection') {
          const mx = (state.x[0] + state.y[0]) / 2;
          const my = (state.x[1] + state.y[1]) / 2;
          plot.line(
            [[mx + n.ey * R * 2, my - n.ex * R * 2], [mx - n.ey * R * 2, my + n.ex * R * 2]],
            { color: 'rgba(148,163,184,0.45)', width: 1, dash: [5, 4] }
          );
        }
        plot.line([[state.x[0], state.x[1]], [state.y[0], state.y[1]]],
          { color: 'rgba(167,139,250,0.55)', width: 1, dash: [3, 3] });

        // Both arrows are the same vector, one of them mirrored, so what the
        // reader sees is exactly the relation between the two noises.
        const mag = Math.hypot(state.dir[0], state.dir[1]);
        const ux = mag > 1e-9 ? state.dir[0] / mag : 1;
        const uy = mag > 1e-9 ? state.dir[1] / mag : 0;
        const [vx, vy] = params.coupling === 'reflection'
          ? reflect(ux, uy, n.ex, n.ey)
          : [ux, uy];
        const L = ARROW * R;

        const arrow = (from, dx, dy, color) => {
          const tip = [from[0] + dx * L, from[1] + dy * L];
          plot.line([[from[0], from[1]], tip], { color, width: 1.8 });
          plot.dot(tip[0], tip[1], { color, r: 2.6 });
        };
        arrow(state.x, ux, uy, '#fdba74');
        arrow(state.y, vx, vy, '#7dd3fc');
      }

      plot.dot(state.y[0], state.y[1], { color: '#38bdf8', r: 4.5, ring: true });
      plot.dot(state.x[0], state.x[1], { color: '#fb923c', r: 4.5, ring: true });
    });

    plot.labelPx(plot.left + 10, plot.top + 8,
      state.coupled
        ? '\\text{coupled}'
        : (params.coupling === 'reflection'
          ? 'd\\widetilde{W} = (I - 2ee^{\\top})\\,dW'
          : 'd\\widetilde{W} = dW'),
      { id: 'rule', anchor: 'top-left' });
  },

  stats(state, params) {
    const gap = Math.hypot(state.x[0] - state.y[0], state.x[1] - state.y[1]);
    const out = [
      { label: 'X', color: '#fb923c' },
      { label: 'Y', color: '#38bdf8' },
      { label: '|X − Y|', value: gap.toPrecision(3) },
    ];
    if (state.coupled) out.push({ label: 'τ', value: state.tau.toFixed(2), color: '#34d399' });
    else if (params.coupling === 'synchronous') out.push({ label: 'gap', value: 'frozen' });
    else out.push({ label: 'τ', value: 'not yet' });
    return out;
  },
});
