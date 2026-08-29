import { defineModel } from '../core/model';

/**
 * Reynolds (1987) flocking — "boids".
 *
 * Each agent steers by three rules computed only from the neighbours inside a
 * perception cone: separation, alignment, cohesion. No agent knows a flock
 * exists; the flock is what the local rules add up to.
 *
 * The world is a torus, so all distances use the wrapped metric. Neighbour
 * queries go through a uniform spatial hash, so cost stays O(n) as the agent
 * count climbs rather than O(n²).
 */

// Scratch objects reused every frame — the inner loop allocates nothing.
const FORCE = { x: 0, y: 0 };
const XS = [];
const YS = [];

function wrapDelta(d, size) {
  const h = size / 2;
  if (d > h) return d - size;
  if (d < -h) return d + size;
  return d;
}

function spawn(rng, env, params) {
  const a = rng() * Math.PI * 2;
  return {
    x: rng() * env.width,
    y: rng() * env.height,
    vx: Math.cos(a) * params.speed,
    vy: Math.sin(a) * params.speed,
    fx: 0, fy: 0, n: 0,
  };
}

/** Reynolds steering: a desired direction becomes a bounded acceleration. */
function steerTowards(agent, dx, dy, weight, maxSpeed, maxForce, out) {
  const m = Math.hypot(dx, dy);
  if (m === 0 || weight === 0) return;
  let sx = (dx / m) * maxSpeed - agent.vx;
  let sy = (dy / m) * maxSpeed - agent.vy;
  const sm = Math.hypot(sx, sy);
  if (sm > maxForce) { sx = (sx / sm) * maxForce; sy = (sy / sm) * maxForce; }
  out.x += sx * weight;
  out.y += sy * weight;
}

function fillAxis(out, c, n) {
  out.length = 0;
  if (n < 3) { for (let i = 0; i < n; i++) out.push(i); }
  else out.push((c - 1 + n) % n, c, (c + 1) % n);
}

function rebuildGrid(state, cell) {
  const w = state.width;
  const h = state.height;
  const cols = Math.max(1, Math.floor(w / cell));
  const rows = Math.max(1, Math.floor(h / cell));

  let g = state.grid;
  if (!g || g.cols !== cols || g.rows !== rows) {
    g = { cols, rows, buckets: new Array(cols * rows) };
    for (let i = 0; i < g.buckets.length; i++) g.buckets[i] = [];
    state.grid = g;
  } else {
    for (let i = 0; i < g.buckets.length; i++) g.buckets[i].length = 0;
  }
  g.cw = w / cols;
  g.ch = h / rows;

  const agents = state.agents;
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    let cx = Math.floor(a.x / g.cw);
    let cy = Math.floor(a.y / g.ch);
    if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
    if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
    g.buckets[cy * cols + cx].push(i);
  }
  return g;
}

export default defineModel({
  id: 'boids',
  name: 'Flocking · Reynolds boids',
  description:
    'Several hundred agents moving as arrowheads on a dark field, coloured by heading. '
    + 'They gather into flocks that split and merge; the cursor scatters them.',

  params: [
    { key: 'count', label: 'Agents', min: 20, max: 700, step: 10, default: 260, group: 'Population' },
    { key: 'speed', label: 'Cruise speed', min: 20, max: 260, step: 5, default: 105, unit: ' px/s', group: 'Population' },

    { key: 'perception', label: 'Perception radius', min: 10, max: 160, step: 2, default: 56, unit: ' px', group: 'Perception' },
    { key: 'separationRadius', label: 'Personal space', min: 4, max: 60, step: 1, default: 18, unit: ' px', group: 'Perception' },
    { key: 'fieldOfView', label: 'Field of view', min: 60, max: 360, step: 5, default: 280, unit: '°', group: 'Perception' },

    { key: 'separation', label: 'Separation', tex: 'w_{\\mathrm{sep}}', min: 0, max: 4, step: 0.05, default: 1.60, group: 'Rules' },
    { key: 'alignment', label: 'Alignment', tex: 'w_{\\mathrm{ali}}', min: 0, max: 4, step: 0.05, default: 1.05, group: 'Rules' },
    { key: 'cohesion', label: 'Cohesion', tex: 'w_{\\mathrm{coh}}', min: 0, max: 4, step: 0.05, default: 0.90, group: 'Rules' },

    { key: 'jitter', label: 'Noise', min: 0, max: 1, step: 0.02, default: 0.10, group: 'Environment' },
    { key: 'cursor', label: 'Cursor repulsion', min: 0, max: 4, step: 0.05, default: 1.40, group: 'Environment' },

    { key: 'trails', label: 'Trails', type: 'toggle', default: true, group: 'Environment' },
    { key: 'inspect', label: 'Inspect one agent', type: 'toggle', default: false, group: 'Environment' },
  ],

  presets: [
    { name: 'Flock',     values: { separation: 1.60, alignment: 1.05, cohesion: 0.90, perception: 56, separationRadius: 18, fieldOfView: 280, count: 260 } },
    { name: 'Swarm',     values: { separation: 2.40, alignment: 0.10, cohesion: 1.60, perception: 90, separationRadius: 30, fieldOfView: 360, count: 300 } },
    { name: 'Schooling', values: { separation: 1.10, alignment: 3.00, cohesion: 0.35, perception: 70, separationRadius: 14, fieldOfView: 240, count: 420 } },
    { name: 'Gas',       values: { separation: 3.00, alignment: 0.00, cohesion: 0.00, perception: 40, separationRadius: 34, fieldOfView: 360, count: 200 } },
  ],

  init(params, rng, env) {
    const agents = [];
    for (let i = 0; i < params.count; i++) agents.push(spawn(rng, env, params));
    return { agents, grid: null, order: 0, meanNeighbours: 0, width: env.width, height: env.height };
  },

  /** Grow/shrink in place so the "Agents" slider is live, not a restart. */
  sync(state, params, rng) {
    const a = state.agents;
    const env = { width: state.width, height: state.height };
    while (a.length < params.count) a.push(spawn(rng, env, params));
    if (a.length > params.count) a.length = params.count;
  },

  step(state, params, dt, rng) {
    const agents = state.agents;
    const n = agents.length;
    if (!n) return;

    const w = state.width;
    const h = state.height;
    const percep2 = params.perception * params.perception;
    const sepR = Math.min(params.separationRadius, params.perception);
    const sepR2 = sepR * sepR;
    const maxSpeed = params.speed;
    const maxForce = params.speed * 3.5;
    const cosFov = Math.cos((params.fieldOfView * Math.PI) / 360);   // half-angle
    const fullFov = params.fieldOfView >= 359;

    const g = rebuildGrid(state, Math.max(params.perception, 8));
    const { cols, rows, cw, ch, buckets } = g;

    let neighbourTotal = 0;

    // ── Pass 1: forces, all read from the current state (order-independent) ──
    for (let i = 0; i < n; i++) {
      const a = agents[i];
      const aSpeed = Math.hypot(a.vx, a.vy) || 1;

      let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, count = 0;

      let cx = Math.floor(a.x / cw);
      let cy = Math.floor(a.y / ch);
      if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
      if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
      fillAxis(XS, cx, cols);
      fillAxis(YS, cy, rows);

      for (let yi = 0; yi < YS.length; yi++) {
        for (let xi = 0; xi < XS.length; xi++) {
          const bucket = buckets[YS[yi] * cols + XS[xi]];
          for (let k = 0; k < bucket.length; k++) {
            const j = bucket[k];
            if (j === i) continue;
            const b = agents[j];

            const dx = wrapDelta(b.x - a.x, w);
            const dy = wrapDelta(b.y - a.y, h);
            const d2 = dx * dx + dy * dy;
            if (d2 > percep2 || d2 === 0) continue;

            const d = Math.sqrt(d2);
            // blind spot behind the agent
            if (!fullFov && (dx * a.vx + dy * a.vy) / (d * aSpeed) < cosFov) continue;

            count++;
            aliX += b.vx; aliY += b.vy;
            cohX += dx;   cohY += dy;      // relative offsets: torus-safe averaging

            if (d2 < sepR2) {
              const push = 1 - d / sepR;
              sepX -= (dx / d) * push;
              sepY -= (dy / d) * push;
            }
          }
        }
      }

      a.n = count;
      neighbourTotal += count;

      FORCE.x = 0; FORCE.y = 0;
      if (count > 0) {
        steerTowards(a, sepX, sepY, params.separation, maxSpeed, maxForce, FORCE);
        steerTowards(a, aliX / count, aliY / count, params.alignment, maxSpeed, maxForce, FORCE);
        steerTowards(a, cohX / count, cohY / count, params.cohesion, maxSpeed, maxForce, FORCE);
      }

      const p = state.pointer;
      if (p && p.active && params.cursor > 0) {
        const R = 120;
        const dx = wrapDelta(a.x - p.x, w);
        const dy = wrapDelta(a.y - p.y, h);
        const d = Math.hypot(dx, dy);
        if (d < R && d > 0) {
          steerTowards(a, dx / d, dy / d, params.cursor * (1 - d / R) * 3, maxSpeed, maxForce, FORCE);
        }
      }

      if (params.jitter > 0) {
        const j = params.jitter * maxForce;
        FORCE.x += (rng() - 0.5) * j;
        FORCE.y += (rng() - 0.5) * j;
      }

      a.fx = FORCE.x;
      a.fy = FORCE.y;
    }

    // ── Pass 2: integrate ──
    let sumX = 0, sumY = 0;
    const minSpeed = maxSpeed * 0.55;
    for (let i = 0; i < n; i++) {
      const a = agents[i];
      a.vx += a.fx * dt;
      a.vy += a.fy * dt;

      const sp = Math.hypot(a.vx, a.vy);
      if (sp > maxSpeed) { const k = maxSpeed / sp; a.vx *= k; a.vy *= k; }
      else if (sp < minSpeed) { const k = minSpeed / (sp || 1); a.vx *= k; a.vy *= k; }

      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.x < 0) a.x += w; else if (a.x >= w) a.x -= w;
      if (a.y < 0) a.y += h; else if (a.y >= h) a.y -= h;

      const m = Math.hypot(a.vx, a.vy) || 1;
      sumX += a.vx / m;
      sumY += a.vy / m;
    }

    // Vicsek order parameter: |mean unit heading| ∈ [0,1].
    state.order = Math.hypot(sumX, sumY) / n;
    state.meanNeighbours = neighbourTotal / n;
  },

  /** Trails come from painting a translucent background instead of clearing. */
  clear(ctx, state, params, env) {
    ctx.fillStyle = params.trails ? 'rgba(11,17,33,0.20)' : '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const agents = state.agents;
    const HUES = 24;

    // Batch by quantised heading: 24 fills per frame instead of one per agent.
    const paths = new Array(HUES);
    for (let i = 0; i < HUES; i++) paths[i] = new Path2D();

    const L = 5.4, W = 2.5;
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const ang = Math.atan2(a.vy, a.vx);
      const c = Math.cos(ang), s = Math.sin(ang);
      let b = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * HUES);
      if (b < 0) b = 0; else if (b >= HUES) b = HUES - 1;
      const p = paths[b];
      p.moveTo(a.x + c * L, a.y + s * L);
      p.lineTo(a.x - c * L * 0.62 - s * W, a.y - s * L * 0.62 + c * W);
      p.lineTo(a.x - c * L * 0.62 + s * W, a.y - s * L * 0.62 - c * W);
      p.closePath();
    }
    for (let i = 0; i < HUES; i++) {
      ctx.fillStyle = `hsl(${Math.round((i / HUES) * 360)}, 68%, 63%)`;
      ctx.fill(paths[i]);
    }

    const ptr = state.pointer;
    if (ptr && ptr.active && params.cursor > 0) {
      ctx.strokeStyle = 'rgba(251,146,60,0.30)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ptr.x, ptr.y, 120, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (params.inspect && agents.length) {
      const a = agents[0];
      const w = env.width, h = env.height;
      const percep2 = params.perception * params.perception;
      const aSpeed = Math.hypot(a.vx, a.vy) || 1;
      const cosFov = Math.cos((params.fieldOfView * Math.PI) / 360);
      const fullFov = params.fieldOfView >= 359;

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(148,163,184,0.35)';
      ctx.beginPath(); ctx.arc(a.x, a.y, params.perception, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(248,113,113,0.45)';
      ctx.beginPath(); ctx.arc(a.x, a.y, params.separationRadius, 0, Math.PI * 2); ctx.stroke();

      ctx.strokeStyle = 'rgba(226,232,240,0.30)';
      ctx.beginPath();
      for (let j = 1; j < agents.length; j++) {
        const b = agents[j];
        const dx = wrapDelta(b.x - a.x, w);
        const dy = wrapDelta(b.y - a.y, h);
        const d2 = dx * dx + dy * dy;
        if (d2 > percep2 || d2 === 0) continue;
        const d = Math.sqrt(d2);
        if (!fullFov && (dx * a.vx + dy * a.vy) / (d * aSpeed) < cosFov) continue;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x + dx, a.y + dy);
      }
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath(); ctx.arc(a.x, a.y, 3.2, 0, Math.PI * 2); ctx.fill();
    }
  },

  stats(state) {
    return [
      { label: 'Agents', value: state.agents.length },
      { label: 'Order φ', value: state.order.toFixed(3) },
      { label: 'Mean neighbours', value: state.meanNeighbours.toFixed(1) },
    ];
  },
});
