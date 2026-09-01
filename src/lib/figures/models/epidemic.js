import { defineModel } from '../core/model';
import { createPlot, layout } from '../core/plot';

/**
 * Two spatial epidemics, differing only in how much people move.
 *
 * The figure exists to demonstrate a four-panel nested layout: a large
 * simulation on the left at full height, and a right-hand column split into a
 * second simulation on top and a row of two plots underneath. That shape is not
 * a grid, so `panelRects` cannot express it — `layout` can.
 *
 * The two worlds start from identical positions and identical infected agents;
 * the only difference is a mobility multiplier. Both run at the same β and γ.
 * Flattening the curve is not a metaphor here: it is the same epidemic with the
 * same parameters, drawn twice.
 *
 * Agents live in the unit square, not in pixels, so the simulation is
 * independent of how big its panel happens to be.
 */

const COLORS = { S: '#64748b', I: '#fb923c', R: '#34d399' };
const HIST = 1600;

function makeAgents(params, rng) {
  const agents = [];
  for (let i = 0; i < params.population; i++) {
    const a = rng() * Math.PI * 2;
    agents.push({ x: rng(), y: rng(), vx: Math.cos(a), vy: Math.sin(a), s: 0 });
  }
  for (let i = 0; i < Math.min(params.seeded, agents.length); i++) agents[i].s = 1;
  return agents;
}

function makeWorld(agents, mobility, label) {
  return {
    label,
    mobility,
    agents: agents.map(a => ({ ...a })),
    grid: null,
    S: 0, I: 0, R: 0,
    peakI: 0,
    hist: [],
    t: 0,
  };
}

function rebuildGrid(world, r) {
  const n = Math.max(1, Math.floor(1 / Math.max(r, 1e-3)));
  let g = world.grid;
  if (!g || g.n !== n) {
    g = { n, buckets: new Array(n * n) };
    for (let i = 0; i < g.buckets.length; i++) g.buckets[i] = [];
    world.grid = g;
  } else {
    for (let i = 0; i < g.buckets.length; i++) g.buckets[i].length = 0;
  }
  const agents = world.agents;
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    let cx = (a.x * n) | 0;
    let cy = (a.y * n) | 0;
    if (cx < 0) cx = 0; else if (cx >= n) cx = n - 1;
    if (cy < 0) cy = 0; else if (cy >= n) cy = n - 1;
    g.buckets[cy * n + cx].push(i);
  }
  return g;
}

function stepWorld(world, params, dt, rng) {
  const agents = world.agents;
  const speed = params.speed * world.mobility;
  const r = params.radius;
  const r2 = r * r;

  // Move, with a slow random turn so the crowd mixes rather than marching.
  const turn = params.jitter * dt;
  for (const a of agents) {
    if (turn > 0) {
      const ang = (rng() - 0.5) * turn * Math.PI;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const vx = a.vx * c - a.vy * s;
      a.vy = a.vx * s + a.vy * c;
      a.vx = vx;
    }
    a.x += a.vx * speed * dt;
    a.y += a.vy * speed * dt;
    if (a.x < 0) a.x += 1; else if (a.x >= 1) a.x -= 1;
    if (a.y < 0) a.y += 1; else if (a.y >= 1) a.y -= 1;
  }

  const g = rebuildGrid(world, r);
  const n = g.n;
  const pInfect = 1 - Math.exp(-params.beta * dt);
  const pRecover = 1 - Math.exp(-params.gamma * dt);

  // Transmission is decided from the state at the top of the step, so an agent
  // infected this tick cannot go on to infect within the same tick.
  const newly = [];
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    if (a.s !== 0) continue;
    let cx = (a.x * n) | 0;
    let cy = (a.y * n) | 0;
    if (cx < 0) cx = 0; else if (cx >= n) cx = n - 1;
    if (cy < 0) cy = 0; else if (cy >= n) cy = n - 1;

    let hit = false;
    for (let dy = -1; dy <= 1 && !hit; dy++) {
      for (let dx = -1; dx <= 1 && !hit; dx++) {
        const bx = (cx + dx + n) % n;
        const by = (cy + dy + n) % n;
        const bucket = g.buckets[by * n + bx];
        for (let k = 0; k < bucket.length; k++) {
          const b = agents[bucket[k]];
          if (b.s !== 1) continue;
          let ddx = b.x - a.x;
          let ddy = b.y - a.y;
          if (ddx > 0.5) ddx -= 1; else if (ddx < -0.5) ddx += 1;
          if (ddy > 0.5) ddy -= 1; else if (ddy < -0.5) ddy += 1;
          if (ddx * ddx + ddy * ddy > r2) continue;
          if (rng() < pInfect) { hit = true; break; }
        }
      }
    }
    if (hit) newly.push(i);
  }

  for (const a of agents) {
    if (a.s === 1 && rng() < pRecover) a.s = 2;
  }
  for (const i of newly) agents[i].s = 1;

  let S = 0;
  let I = 0;
  let R = 0;
  for (const a of agents) {
    if (a.s === 0) S++; else if (a.s === 1) I++; else R++;
  }
  world.S = S;
  world.I = I;
  world.R = R;
  if (I > world.peakI) world.peakI = I;
  world.t += dt;
  world.hist.push([world.t, S, I, R]);
  if (world.hist.length > HIST) world.hist.shift();
}

/** Draw one world into a rect: a square arena, agents batched by state. */
function drawWorld(ctx, world, rect, params, title, theme) {
  const side = Math.min(rect.w, rect.h) - 22;
  const ox = rect.x + (rect.w - side) / 2;
  const oy = rect.y + (rect.h - side) / 2 + 6;
  world.view = { ox, oy, side };

  ctx.strokeStyle = 'rgba(100,116,139,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox + 0.5, oy + 0.5, side, side);

  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = theme.muted || '#94a3b8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(title, ox, oy - 4);

  if (params.showRadius) {
    ctx.strokeStyle = 'rgba(251,146,60,0.16)';
    ctx.beginPath();
    for (const a of world.agents) {
      if (a.s !== 1) continue;
      ctx.moveTo(ox + a.x * side + params.radius * side, oy + a.y * side);
      ctx.arc(ox + a.x * side, oy + a.y * side, params.radius * side, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  const paths = [new Path2D(), new Path2D(), new Path2D()];
  const rad = Math.max(1.1, side / 220);
  for (const a of world.agents) {
    const p = paths[a.s];
    const px = ox + a.x * side;
    const py = oy + a.y * side;
    p.moveTo(px + rad, py);
    p.arc(px, py, rad, 0, Math.PI * 2);
  }
  ctx.fillStyle = COLORS.R; ctx.fill(paths[2]);
  ctx.fillStyle = COLORS.S; ctx.fill(paths[0]);
  ctx.fillStyle = COLORS.I; ctx.fill(paths[1]);
}

export default defineModel({
  id: 'epidemic',
  name: 'Epidemic · Mobility and the curve',
  description:
    'Two square arenas of moving dots turning from grey to orange to green as an '
    + 'infection spreads, beside plots of the infected count and the susceptible–infected plane.',

  params: [
    { key: 'population', label: 'Population', tex: 'N', min: 100, max: 900, step: 25, default: 420, reinit: true, group: 'Population' },
    { key: 'seeded', label: 'Initially infected', min: 1, max: 30, step: 1, default: 6, reinit: true, group: 'Population' },

    { key: 'beta', label: 'Transmission', tex: '\\beta', min: 0.2, max: 12, step: 0.1, default: 4, group: 'Disease' },
    { key: 'gamma', label: 'Recovery', tex: '\\gamma', min: 0.05, max: 2, step: 0.05, default: 0.35, group: 'Disease' },
    { key: 'radius', label: 'Contact radius', min: 0.012, max: 0.08, step: 0.002, default: 0.028, group: 'Disease' },

    { key: 'speed', label: 'Mobility', min: 0, max: 0.5, step: 0.01, default: 0.16, group: 'Movement' },
    { key: 'lockdown', label: 'Reduced mobility', min: 0, max: 1, step: 0.02, default: 0.25, group: 'Movement',
      hint: 'Mobility multiplier for the second world' },
    { key: 'jitter', label: 'Turning', min: 0, max: 4, step: 0.1, default: 1.2, group: 'Movement' },

    { key: 'showRadius', label: 'Contact radii', type: 'toggle', default: false, group: 'View' },
  ],

  presets: [
    { name: 'Baseline',      values: { beta: 4, gamma: 0.35, speed: 0.16, lockdown: 0.25 } },
    { name: 'No difference', values: { lockdown: 1 } },
    { name: 'Hard stop',     values: { lockdown: 0.04 } },
    { name: 'Slow disease',  values: { beta: 1.6, gamma: 0.2 } },
    { name: 'Dense',         values: { population: 800, radius: 0.02 } },
  ],

  actions: [
    { id: 'reseed', label: 'Re-infect', run(state, params, rng) {
      for (const w of [state.a, state.b]) {
        for (let i = 0; i < params.seeded; i++) {
          w.agents[(rng() * w.agents.length) | 0].s = 1;
        }
      }
    } },
  ],

  init(params, rng) {
    // Both worlds start from the same agents, so the only difference between
    // them is the mobility multiplier.
    const agents = makeAgents(params, rng);
    return {
      a: makeWorld(agents, 1, 'full mobility'),
      b: makeWorld(agents, params.lockdown, 'reduced mobility'),
    };
  },

  sync(state, params) {
    state.b.mobility = params.lockdown;
  },

  step(state, params, dt, rng) {
    stepWorld(state.a, params, dt, rng);
    stepWorld(state.b, params, dt, rng);
  },

  /** Click either arena to infect whoever is nearest. */
  onPointer(state, pointer) {
    for (const w of [state.a, state.b]) {
      const v = w.view;
      if (!v || !pointer.down) continue;
      const x = (pointer.x - v.ox) / v.side;
      const y = (pointer.y - v.oy) / v.side;
      if (x < 0 || x > 1 || y < 0 || y > 1) continue;
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < w.agents.length; i++) {
        const a = w.agents[i];
        const d = (a.x - x) ** 2 + (a.y - y) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best >= 0) w.agents[best].s = 1;
    }
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const theme = env.theme || {};

    // Exactly the shape a grid cannot express: one full-height panel on the
    // left, and a right-hand column that splits into a panel and then a row.
    const L = layout(env, {
      dir: 'row',
      gap: 10,
      children: [
        { id: 'main', flex: 1.15 },
        {
          dir: 'column',
          flex: 1,
          gap: 8,
          children: [
            { id: 'second', flex: 1.15 },
            {
              dir: 'row',
              flex: 1,
              gap: 8,
              children: [{ id: 'curve' }, { id: 'plane' }],
            },
          ],
        },
      ],
    });

    drawWorld(ctx, state.a, L.main, params, 'full mobility', theme);
    drawWorld(ctx, state.b, L.second, params, `mobility × ${params.lockdown.toFixed(2)}`, theme);

    const N = params.population;
    const tMax = Math.max(20, state.a.t);
    const t0 = Math.max(0, tMax - 60);

    // ── Infected against time, both worlds ──
    const curve = createPlot(ctx, env, {
      rect: L.curve,
      xDomain: [t0, tMax],
      yDomain: [0, Math.max(20, state.a.peakI, state.b.peakI) * 1.15],
      padding: { top: 10, right: 12, bottom: 20, left: 38 },
      labels: state.labels,
    });
    curve.frame({ xLabel: 't' });
    curve.clip(() => {
      for (const [w, dash] of [[state.a, null], [state.b, [5, 3]]]) {
        const pts = w.hist.filter(h => h[0] >= t0).map(h => [h[0], h[2]]);
        curve.line(pts, { color: COLORS.I, width: 1.5, dash, alpha: dash ? 0.75 : 1 });
      }
    });
    curve.labelPx(curve.left + 6, curve.top + 4, 'I(t)', { id: 'curve-label', anchor: 'top-left' });

    // ── The S–I plane, both worlds ──
    const plane = createPlot(ctx, env, {
      rect: L.plane,
      xDomain: [0, N],
      yDomain: [0, Math.max(20, state.a.peakI, state.b.peakI) * 1.15],
      padding: { top: 10, right: 12, bottom: 20, left: 38 },
      labels: state.labels,
    });
    plane.frame({ xLabel: 'S' });
    plane.clip(() => {
      for (const [w, dash] of [[state.a, null], [state.b, [5, 3]]]) {
        plane.line(w.hist.map(h => [h[1], h[2]]), {
          color: '#a78bfa',
          width: 1.4,
          dash,
          alpha: dash ? 0.75 : 1,
        });
        plane.dot(w.S, w.I, { color: '#c4b5fd', r: 3, ring: true });
      }
    });
    plane.labelPx(plane.left + 6, plane.top + 4, 'I \\text{ vs } S', { id: 'plane-label', anchor: 'top-left' });

    // Mean-field reproduction number: β times the expected number of contacts
    // inside the radius, over γ.
    const contacts = params.population * Math.PI * params.radius * params.radius;
    const r0 = (params.beta * contacts) / params.gamma;
    state.r0 = r0;

    if (state.labels) {
      state.labels.push({
        id: 'sir',
        tex: `\\dot{S} = -\\beta SI/N,\\quad \\dot{I} = \\beta SI/N - \\gamma I,\\quad \\dot{R} = \\gamma I`,
        x: L.main.x + 10,
        y: 10,
        anchor: 'top-left',
        chip: true,
      });
      state.labels.push({
        id: 'r0',
        tex: `\\mathcal{R}_0 \\approx ${r0.toFixed(2)}`,
        x: env.width - 10,
        y: 10,
        anchor: 'top-right',
        chip: true,
        color: r0 > 1 ? '#fdba74' : '#34d399',
      });
    }
  },

  stats(state, params) {
    const pct = v => `${((v / params.population) * 100).toFixed(1)} %`;
    return [
      { label: 'Susceptible', color: COLORS.S },
      { label: 'Infected', color: COLORS.I },
      { label: 'Recovered', color: COLORS.R },
      { label: 'Full mobility · peak I', value: `${state.a.peakI} (${pct(state.a.peakI)})` },
      { label: 'Reduced · peak I', value: `${state.b.peakI} (${pct(state.b.peakI)})` },
      { label: 'Full · ever infected', value: pct(state.a.R + state.a.I) },
      { label: 'Reduced · ever infected', value: pct(state.b.R + state.b.I) },
      { label: 'R₀', value: (state.r0 || 0).toFixed(2) },
    ];
  },
});
