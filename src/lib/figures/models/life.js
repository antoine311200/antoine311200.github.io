import { defineModel } from '../core/model';

/**
 * Life-like cellular automata.
 *
 * A different shape of model from the agent simulations: discrete state on a
 * lattice, stepping at its own slow rate (the engine reads `rate`, so the
 * fixed timestep here is 1/12 s rather than 1/60 s), and edited by pointer.
 *
 * Rules are given in birth/survival notation and stored as neighbour-count
 * bitmasks, so the step loop is two bit tests rather than a branch tree.
 */

const RULES = {
  life:       { label: 'Life · B3/S23',        b: 0b000001000,  s: 0b000001100 },
  highlife:   { label: 'HighLife · B36/S23',   b: 0b001001000,  s: 0b000001100 },
  daynight:   { label: 'Day & Night · B3678/S34678', b: 0b111001000, s: 0b111011000 },
  maze:       { label: 'Maze · B3/S12345',     b: 0b000001000,  s: 0b000111110 },
  seeds:      { label: 'Seeds · B2/S',         b: 0b000000100,  s: 0b000000000 },
  replicator: { label: 'Replicator · B1357/S1357', b: 0b010101010, s: 0b010101010 },
};

const PATTERNS = {
  random:   { label: 'Random soup', cells: null },
  gun:      {
    label: 'Gosper glider gun',
    cells: [[0,4],[0,5],[1,4],[1,5],[10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],
            [13,2],[13,8],[14,5],[15,3],[15,7],[16,4],[16,5],[16,6],[17,5],
            [20,2],[20,3],[20,4],[21,2],[21,3],[21,4],[22,1],[22,5],
            [24,0],[24,1],[24,5],[24,6],[34,2],[34,3],[35,2],[35,3]],
    anchor: 'topleft',
  },
  rpento:   { label: 'R-pentomino', cells: [[1,0],[2,0],[0,1],[1,1],[1,2]] },
  acorn:    { label: 'Acorn', cells: [[1,0],[3,1],[0,2],[1,2],[4,2],[5,2],[6,2]] },
  empty:    { label: 'Empty (draw your own)', cells: [] },
};

// Age ramp: freshly born is warm, long-lived is cool.
const AGE_COLORS = [
  '#fde68a', '#fdba74', '#fb923c', '#f97316',
  '#e879a9', '#c084fc', '#a78bfa', '#818cf8',
  '#6366f1', '#4f6ef7', '#3b82f6', '#38bdf8',
];

function dims(env, cell) {
  return {
    cols: Math.max(4, Math.floor(env.width / cell)),
    rows: Math.max(4, Math.floor(env.height / cell)),
  };
}

function allocate(cols, rows) {
  return {
    cols, rows,
    cells: new Uint8Array(cols * rows),
    next: new Uint8Array(cols * rows),
    age: new Uint16Array(cols * rows),
  };
}

function seed(state, params, rng) {
  const { cols, rows, cells, age } = state;
  cells.fill(0);
  age.fill(0);

  const pattern = PATTERNS[params.pattern] || PATTERNS.random;
  if (pattern.cells === null) {
    for (let i = 0; i < cells.length; i++) cells[i] = rng() < params.density ? 1 : 0;
  } else if (pattern.cells.length) {
    let maxX = 0, maxY = 0;
    for (const [x, y] of pattern.cells) { if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
    const ox = pattern.anchor === 'topleft'
      ? Math.max(1, Math.floor((cols - maxX) / 8))
      : Math.floor((cols - maxX) / 2);
    const oy = pattern.anchor === 'topleft'
      ? Math.max(1, Math.floor((rows - maxY) / 8))
      : Math.floor((rows - maxY) / 2);
    for (const [x, y] of pattern.cells) {
      const cx = ox + x, cy = oy + y;
      if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) cells[cy * cols + cx] = 1;
    }
  }
  state.generation = 0;
  state.alive = cells.reduce((a, v) => a + v, 0);
}

export default defineModel({
  id: 'game-of-life',
  name: 'Cellular automata · Life',
  description:
    'A lattice of square cells switching between alive and dead each generation, '
    + 'coloured by how long each cell has survived.',
  rate: 12,

  params: [
    { key: 'rule', label: 'Rule', type: 'select', default: 'life', group: 'Rule',
      options: Object.entries(RULES).map(([value, r]) => ({ value, label: r.label })) },
    { key: 'pattern', label: 'Initial state', type: 'select', default: 'random', reinit: true, group: 'Rule',
      options: Object.entries(PATTERNS).map(([value, p]) => ({ value, label: p.label })) },
    { key: 'density', label: 'Soup density', min: 0.02, max: 0.6, step: 0.01, default: 0.22, reinit: true, group: 'Rule' },

    { key: 'cell', label: 'Cell size', min: 3, max: 18, step: 1, default: 7, unit: ' px', reinit: true, group: 'Lattice' },
    { key: 'wrap', label: 'Wrap edges', type: 'toggle', default: true, group: 'Lattice' },
    { key: 'ageColor', label: 'Colour by age', type: 'toggle', default: true, group: 'Lattice' },
    { key: 'grid', label: 'Show lattice', type: 'toggle', default: false, group: 'Lattice' },
  ],

  presets: [
    { name: 'Conway soup',  values: { rule: 'life', pattern: 'random', density: 0.22, cell: 7 } },
    { name: 'Glider gun',   values: { rule: 'life', pattern: 'gun', cell: 7 } },
    { name: 'Acorn',        values: { rule: 'life', pattern: 'acorn', cell: 5 } },
    { name: 'Maze',         values: { rule: 'maze', pattern: 'random', density: 0.08, cell: 6 } },
    { name: 'Replicator',   values: { rule: 'replicator', pattern: 'rpento', cell: 5 } },
  ],

  actions: [
    { id: 'clear', label: 'Clear', run(state) {
      state.cells.fill(0); state.age.fill(0); state.alive = 0; state.generation = 0;
    } },
    { id: 'randomise', label: 'Re-seed', run(state, params, rng) {
      const p = { ...params, pattern: 'random' };
      seed(state, p, rng);
    } },
  ],

  init(params, rng, env) {
    const { cols, rows } = dims(env, params.cell);
    const state = allocate(cols, rows);
    state.width = env.width;
    state.height = env.height;
    seed(state, params, rng);
    return state;
  },

  /** A canvas resize changes the lattice; rebuild rather than stretch it. */
  sync(state, params, rng) {
    const { cols, rows } = dims({ width: state.width, height: state.height }, params.cell);
    if (cols === state.cols && rows === state.rows) return;
    const fresh = allocate(cols, rows);
    Object.assign(state, fresh);
    seed(state, params, rng);
  },

  step(state, params) {
    const { cols, rows, cells, next, age } = state;
    const rule = RULES[params.rule] || RULES.life;
    const wrap = params.wrap;
    let alive = 0;

    for (let y = 0; y < rows; y++) {
      const yUp = y === 0 ? (wrap ? rows - 1 : -1) : y - 1;
      const yDn = y === rows - 1 ? (wrap ? 0 : -1) : y + 1;
      for (let x = 0; x < cols; x++) {
        const xLf = x === 0 ? (wrap ? cols - 1 : -1) : x - 1;
        const xRt = x === cols - 1 ? (wrap ? 0 : -1) : x + 1;

        let n = 0;
        if (yUp >= 0) {
          const r = yUp * cols;
          if (xLf >= 0) n += cells[r + xLf];
          n += cells[r + x];
          if (xRt >= 0) n += cells[r + xRt];
        }
        if (xLf >= 0) n += cells[y * cols + xLf];
        if (xRt >= 0) n += cells[y * cols + xRt];
        if (yDn >= 0) {
          const r = yDn * cols;
          if (xLf >= 0) n += cells[r + xLf];
          n += cells[r + x];
          if (xRt >= 0) n += cells[r + xRt];
        }

        const i = y * cols + x;
        const was = cells[i];
        const mask = 1 << n;
        const now = was ? ((rule.s & mask) ? 1 : 0) : ((rule.b & mask) ? 1 : 0);
        next[i] = now;
        if (now) {
          alive++;
          age[i] = was ? Math.min(65000, age[i] + 1) : 0;
        } else {
          age[i] = 0;
        }
      }
    }

    cells.set(next);
    state.alive = alive;
    state.generation = (state.generation || 0) + 1;
  },

  /** Paint cells with the pointer — the lattice is directly editable. */
  onPointer(state, pointer, params) {
    if (!pointer.down) return;
    const cw = state.width / state.cols;
    const ch = state.height / state.rows;
    const x = Math.floor(pointer.x / cw);
    const y = Math.floor(pointer.y / ch);
    if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) return;
    const i = y * state.cols + x;
    if (!state.cells[i]) {
      state.cells[i] = 1;
      state.age[i] = 0;
      state.alive++;
    }
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const { cols, rows, cells, age } = state;
    const cw = env.width / cols;
    const ch = env.height / rows;
    const pad = cw > 5 ? 1 : 0;

    if (params.grid && cw >= 6) {
      ctx.strokeStyle = 'rgba(51,65,85,0.35)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 1; x < cols; x++) { ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, env.height); }
      for (let y = 1; y < rows; y++) { ctx.moveTo(0, y * ch); ctx.lineTo(env.width, y * ch); }
      ctx.stroke();
    }

    if (!params.ageColor) {
      ctx.fillStyle = '#fdba74';
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (cells[y * cols + x]) ctx.fillRect(x * cw, y * ch, cw - pad, ch - pad);
        }
      }
      return;
    }

    // One fill per colour band rather than one per cell.
    const bands = AGE_COLORS.length;
    const paths = new Array(bands);
    for (let i = 0; i < bands; i++) paths[i] = new Path2D();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (!cells[i]) continue;
        const a = age[i];
        let band = a < bands ? a : bands - 1;
        paths[band].rect(x * cw, y * ch, cw - pad, ch - pad);
      }
    }
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = AGE_COLORS[i];
      ctx.fill(paths[i]);
    }
  },

  stats(state) {
    const total = state.cols * state.rows;
    return [
      { label: 'Generation', value: state.generation },
      { label: 'Alive', value: state.alive },
      { label: 'Density', value: (state.alive / total).toFixed(3) },
      { label: 'Lattice', value: `${state.cols}×${state.rows}` },
    ];
  },
});
