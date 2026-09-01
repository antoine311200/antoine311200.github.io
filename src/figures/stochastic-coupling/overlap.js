import { defineModel, createPlot } from '../../lib/figures';

/**
 * Total variation as the mass two laws cannot share.
 *
 *   ‖p − q‖_TV = 1 − ∫ min(p, q)
 *
 * One slider moves the two bells apart; the shaded region is the shared mass,
 * and the number above it is what any coupling of p and q must pay.
 *
 * Both laws are unit Gaussians, so the distance is exact rather than measured:
 * ‖p − q‖_TV = 2Φ(δ/2) − 1 for a separation δ.
 */

const LO = -4.5;
const HI = 7.5;
const N = 300;

const pdf = (x, mu) => Math.exp(-0.5 * (x - mu) * (x - mu)) / Math.sqrt(2 * Math.PI);

function erf(x) {
  const s = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));

export default defineModel({
  id: 'sc-overlap',
  name: 'Total variation as shared mass',
  description:
    'Two bell curves with the region under both of them shaded; the shaded area '
    + 'is the mass the two laws share, and what is left over is their total variation distance.',

  // Nothing evolves here: it is a picture with one knob.
  static: true,
  zoom: { max: 4 },

  params: [
    { key: 'shift', label: 'Separation', tex: '\\mu_q - \\mu_p',
      min: 0, max: 4, step: 0.05, default: 1.4 },
  ],

  init: () => ({}),
  step: () => {},

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const d = params.shift;
    const tv = 2 * Phi(d / 2) - 1;

    const plot = createPlot(ctx, env, {
      xDomain: [LO, HI],
      yDomain: [0, 0.47],
      padding: { top: 34, right: 18, bottom: 28, left: 46 },
      labels: state.labels,
    });
    plot.frame({ xLabel: 'x', yLabel: 'density' });

    plot.clip(() => {
      // The shared mass, ∫ min(p, q).
      ctx.fillStyle = 'rgba(148,163,184,0.3)';
      ctx.beginPath();
      ctx.moveTo(plot.xToPx(LO), plot.yToPx(0));
      for (let i = 0; i <= N; i++) {
        const x = LO + ((HI - LO) * i) / N;
        ctx.lineTo(plot.xToPx(x), plot.yToPx(Math.min(pdf(x, 0), pdf(x, d))));
      }
      ctx.lineTo(plot.xToPx(HI), plot.yToPx(0));
      ctx.closePath();
      ctx.fill();

      plot.curve(x => pdf(x, 0), { color: '#fb923c', width: 2 });
      plot.curve(x => pdf(x, d), { color: '#38bdf8', width: 2, dash: [6, 3] });
    });

    plot.labelPx(plot.left + 10, plot.top - 22,
      `\\|p-q\\|_{TV} = 1 - \\int \\min(p,q) = ${tv.toFixed(3)}`,
      { id: 'tv', anchor: 'top-left' });

    // Where the shaded band sits, said in words rather than in a legend.
    if (d > 0.25) {
      plot.label(d / 2, Math.min(pdf(d / 2, 0), pdf(d / 2, d)) * 0.42,
        '\\int\\min(p,q)', { id: 'shared', anchor: 'center', color: '#cbd5e1' });
    }
  },

  stats(state, params) {
    const tv = 2 * Phi(params.shift / 2) - 1;
    return [
      { label: 'p = N(0,1)', color: '#fb923c' },
      { label: 'q = N(δ,1)', color: '#38bdf8', dashed: true },
      { label: 'shared', value: (1 - tv).toFixed(3) },
      { label: 'TV', value: tv.toFixed(3) },
    ];
  },
});
