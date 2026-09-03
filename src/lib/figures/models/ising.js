import { defineModel } from '../core/model';
import { createPlot, panelRects } from '../core/plot';

/**
 * The 2D Ising model, by Metropolis.
 *
 *   H = -J Σ_⟨ij⟩ sᵢsⱼ - h Σᵢ sᵢ
 *
 * Onsager's exact critical temperature for the square lattice with J = 1 is
 * Tc = 2 / ln(1 + √2) ≈ 2.269. Drag the temperature slider through it: below,
 * one sign takes over and the magnetisation trace pins near ±1; above, the
 * domains dissolve and the trace rattles around zero. Sitting *at* Tc gives the
 * scale-free tangle of domains within domains — and critical slowing down,
 * visible as a magnetisation that wanders instead of settling.
 *
 * Two panels, one of which is not a plot: the lattice is painted straight into
 * its rect, and only the trace below is a `createPlot`.
 *
 * Click and drag on the lattice to force spins up.
 */

const TC = 2 / Math.log(1 + Math.SQRT2);
const HISTORY = 600;

function allocate(L, rng, ordered) {
  const spins = new Int8Array(L * L);
  for (let i = 0; i < spins.length; i++) {
    spins[i] = ordered ? 1 : (rng() < 0.5 ? 1 : -1);
  }
  return spins;
}

function magnetisation(spins) {
  let s = 0;
  for (let i = 0; i < spins.length; i++) s += spins[i];
  return s / spins.length;
}

function energyPerSite(spins, L) {
  let e = 0;
  for (let y = 0; y < L; y++) {
    for (let x = 0; x < L; x++) {
      const s = spins[y * L + x];
      e -= s * spins[y * L + ((x + 1) % L)];
      e -= s * spins[((y + 1) % L) * L + x];
    }
  }
  return e / spins.length;
}

export default defineModel({
  id: 'ising',
  name: 'Statistical mechanics · Ising model',
  description:
    'A square lattice of black and orange cells forming domains that grow and '
    + 'dissolve as the temperature changes, above a plot of the magnetisation.',

  params: [
    { key: 'T', label: 'Temperature', tex: 'T', min: 0.4, max: 5, step: 0.01, default: 2.27, group: 'Thermodynamics',
      hint: 'Tc ≈ 2.269 for the square lattice' },
    { key: 'h', label: 'External field', tex: 'h', min: -0.6, max: 0.6, step: 0.01, default: 0, group: 'Thermodynamics' },
    { key: 'sweeps', label: 'Sweeps / frame', min: 0.05, max: 4, step: 0.05, default: 1, group: 'Thermodynamics' },

    { key: 'size', label: 'Lattice', min: 40, max: 220, step: 10, default: 120, reinit: true, group: 'Lattice',
      format: v => `${v}×${v}` },
    { key: 'ordered', label: 'Start aligned', type: 'toggle', default: false, reinit: true, group: 'Lattice' },
    { key: 'trace', label: 'Magnetisation trace', type: 'toggle', default: true, group: 'Lattice' },
  ],

  presets: [
    { name: 'Below Tc',   values: { T: 1.6, h: 0 } },
    { name: 'At Tc',      values: { T: 2.27, h: 0 } },
    { name: 'Above Tc',   values: { T: 3.4, h: 0 } },
    { name: 'Field flip', values: { T: 2.0, h: 0.25 } },
    { name: 'Quench',     values: { T: 0.7, h: 0, ordered: false } },
  ],

  actions: [
    { id: 'randomise', label: 'Randomise', run(state, params, rng) {
      state.spins = allocate(state.L, rng, false);
      state.history.length = 0;
    } },
    { id: 'align', label: 'Align', run(state, params, rng) {
      state.spins = allocate(state.L, rng, true);
      state.history.length = 0;
    } },
  ],

  init(params, rng) {
    const L = params.size;
    return {
      L,
      spins: allocate(L, rng, params.ordered),
      history: [],
      m: 0,
      e: 0,
      accepted: 0,
      attempted: 0,
      panel: null,
    };
  },

  step(state, params, dt, rng) {
    const L = state.L;
    const spins = state.spins;
    const n = L * L;
    const beta = 1 / Math.max(0.05, params.T);
    const attempts = Math.max(1, Math.round(n * params.sweeps));

    // Boltzmann factors depend only on the neighbour sum, which takes five
    // values; the field term is the only continuous part.
    const table = new Float64Array(5);
    for (let i = 0; i < 5; i++) {
      const nb = -4 + 2 * i;                 // −4, −2, 0, 2, 4
      table[i] = Math.exp(-2 * beta * nb);
    }

    let accepted = 0;
    for (let a = 0; a < attempts; a++) {
      const x = (rng() * L) | 0;
      const y = (rng() * L) | 0;
      const i = y * L + x;
      const s = spins[i];

      const nb = spins[y * L + (x + 1) % L]
        + spins[y * L + (x - 1 + L) % L]
        + spins[((y + 1) % L) * L + x]
        + spins[((y - 1 + L) % L) * L + x];

      // ΔE = 2s(Σ neighbours) + 2hs
      const dEn = 2 * s * nb;
      const dEh = 2 * params.h * s;
      const dE = dEn + dEh;

      if (dE <= 0) {
        spins[i] = -s;
        accepted++;
      } else {
        const p = table[(s * nb + 4) / 2] * Math.exp(-beta * dEh);
        if (rng() < p) { spins[i] = -s; accepted++; }
      }
    }

    state.attempted += attempts;
    state.accepted += accepted;
    state.m = magnetisation(spins);
    state.history.push(state.m);
    if (state.history.length > HISTORY) state.history.shift();
  },

  /** Drag on the lattice to force a patch of spins up. */
  onPointer(state, pointer, params) {
    const rect = state.panel;
    if (!rect || !pointer.down) return;
    if (pointer.x < rect.x || pointer.x > rect.x + rect.side) return;
    if (pointer.y < rect.y || pointer.y > rect.y + rect.side) return;

    const L = state.L;
    const cx = Math.floor(((pointer.x - rect.x) / rect.side) * L);
    const cy = Math.floor(((pointer.y - rect.y) / rect.side) * L);
    const r = Math.max(2, Math.round(L / 24));
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = (cx + dx + L) % L;
        const y = (cy + dy + L) % L;
        state.spins[y * L + x] = 1;
      }
    }
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const showTrace = params.trace;
    const rects = showTrace
      ? panelRects(env, { rows: 2, ratios: [3, 1.15], gap: 8 })
      : [{ x: 0, y: 0, w: env.width, h: env.height }];
    const top = rects[0];

    // ── Panel 1: the lattice, painted straight into its rect ──
    const L = state.L;
    const side = Math.min(top.w, top.h) - 8;
    const ox = top.x + (top.w - side) / 2;
    const oy = top.y + (top.h - side) / 2;
    state.panel = { x: ox, y: oy, side };

    const cell = side / L;
    const up = new Path2D();
    const down = new Path2D();
    for (let y = 0; y < L; y++) {
      for (let x = 0; x < L; x++) {
        const p = state.spins[y * L + x] > 0 ? up : down;
        p.rect(ox + x * cell, oy + y * cell, cell + 0.5, cell + 0.5);
      }
    }
    ctx.fillStyle = '#fb923c';
    ctx.fill(up);
    ctx.fillStyle = '#16213d';
    ctx.fill(down);

    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, side - 1, side - 1);

    if (state.labels) {
      state.labels.push({
        id: 'hamiltonian',
        tex: 'H = -\\sum_{\\langle ij \\rangle} s_i s_j'
          + ` - ${params.h.toFixed(2)}\\sum_i s_i`,
        x: 12,
        y: 12,
        anchor: 'top-left',
        chip: true,
      });
      state.labels.push({
        id: 'temperature',
        tex: `T = ${params.T.toFixed(2)} = ${(params.T / TC).toFixed(3)}\\,T_c`,
        x: env.width - 12,
        y: 12,
        anchor: 'top-right',
        chip: true,
        color: params.T < TC ? '#fdba74' : '#38bdf8',
      });
    }

    // ── Panel 2: magnetisation against Monte Carlo time ──
    if (!showTrace) return;
    const plot = createPlot(ctx, env, {
      rect: rects[1],
      xDomain: [0, HISTORY],
      yDomain: [-1.05, 1.05],
      padding: { top: 8, right: 18, bottom: 22, left: 48 },
      labels: state.labels,
    });
    plot.frame({ xLabel: 'sweeps', yLabel: 'm' });
    plot.clip(() => {
      const pts = state.history.map((m, i) => [i, m]);
      plot.line(pts, { color: '#fdba74', width: 1.4 });
    });
  },

  stats(state, params) {
    const rate = state.attempted ? state.accepted / state.attempted : 0;
    return [
      { label: 'Magnetisation', color: '#fdba74', value: state.m.toFixed(4) },
      { label: '|m|', value: Math.abs(state.m).toFixed(4) },
      { label: 'Energy / site', value: energyPerSite(state.spins, state.L).toFixed(4) },
      { label: 'T / Tc', value: (params.T / TC).toFixed(3) },
      { label: 'Acceptance', value: `${(rate * 100).toFixed(1)} %` },
      { label: 'Phase', value: params.T < TC ? 'ordered' : 'disordered' },
    ];
  },
});
