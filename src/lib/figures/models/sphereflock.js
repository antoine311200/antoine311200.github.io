import { defineModel } from '../core/model';
import {
  createScene, makeCamera, orbitFromPointer,
  cross, dot, len, normalize, rotateAbout, tangent,
} from '../core/scene3d';

/**
 * Flocking on a manifold — the same three rules as `boids`, but with S² for a
 * world instead of a flat torus.
 *
 * Every operation has to be redone intrinsically:
 *
 *  · distance is the geodesic angle, arccos(pᵢ·pⱼ), not a Euclidean norm;
 *  · "toward a neighbour" is the unit tangent at pᵢ pointing along the great
 *    circle through pⱼ, i.e. the normalised tangential part of pⱼ;
 *  · alignment cannot add velocities living in different tangent planes, so a
 *    neighbour's vᵢ is transported by projecting it into T_{pᵢ}S²;
 *  · integration follows the geodesic exactly — rotating both p and v about
 *    p × v by |v| dt — instead of stepping in a straight line and renormalising.
 *
 * The payoff is visible: on a sphere there is no way for every agent to agree
 * on a direction (you cannot comb a hairy ball), so instead of one global flock
 * you get circulating bands and long-lived vortices.
 *
 * Drag to orbit.
 */

const DEG = Math.PI / 180;
const TRAIL = 18;

function randomUnit(rng) {
  // Marsaglia: uniform on the sphere, no polar clustering.
  const z = rng() * 2 - 1;
  const t = rng() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(t), r * Math.sin(t), z];
}

function spawn(rng, params) {
  const p = randomUnit(rng);
  let v = tangent(randomUnit(rng), p);
  if (len(v) < 1e-6) v = tangent([1, 0, 0], p);
  v = normalize(v);
  return {
    p,
    v: [v[0] * params.speed, v[1] * params.speed, v[2] * params.speed],
    trail: new Float32Array(TRAIL * 3),
    trailN: 0,
    hue: 40,
  };
}

/** desiredDir (unit, tangent) → bounded steering acceleration, added to out. */
function steer(agent, dir, weight, maxSpeed, maxForce, out) {
  const m = len(dir);
  if (m < 1e-9 || weight === 0) return;
  let sx = (dir[0] / m) * maxSpeed - agent.v[0];
  let sy = (dir[1] / m) * maxSpeed - agent.v[1];
  let sz = (dir[2] / m) * maxSpeed - agent.v[2];
  const sm = Math.sqrt(sx * sx + sy * sy + sz * sz);
  if (sm > maxForce) {
    const k = maxForce / sm;
    sx *= k; sy *= k; sz *= k;
  }
  out[0] += sx * weight;
  out[1] += sy * weight;
  out[2] += sz * weight;
}

const FORCE = [0, 0, 0];

export default defineModel({
  id: 'sphere-flock',
  name: 'Manifold flocking · S²',
  description:
    'A few hundred coloured dots moving over the surface of a rotating sphere, '
    + 'gathering into circulating bands. Drag to rotate the view.',

  params: [
    { key: 'count', label: 'Agents', min: 20, max: 420, step: 10, default: 190, group: 'Population' },
    { key: 'speed', label: 'Angular speed', min: 0.05, max: 1.6, step: 0.05, default: 0.5, unit: ' rad/s', group: 'Population' },

    { key: 'perception', label: 'Perception', min: 5, max: 90, step: 1, default: 34, unit: '°', group: 'Perception' },
    { key: 'personal', label: 'Personal space', min: 2, max: 45, step: 1, default: 13, unit: '°', group: 'Perception' },

    { key: 'separation', label: 'Separation', tex: 'w_{\\mathrm{sep}}', min: 0, max: 4, step: 0.05, default: 1.5, group: 'Rules' },
    { key: 'alignment', label: 'Alignment', tex: 'w_{\\mathrm{ali}}', min: 0, max: 4, step: 0.05, default: 1.3, group: 'Rules' },
    { key: 'cohesion', label: 'Cohesion', tex: 'w_{\\mathrm{coh}}', min: 0, max: 4, step: 0.05, default: 0.75, group: 'Rules' },
    { key: 'jitter', label: 'Noise', min: 0, max: 1, step: 0.02, default: 0.08, group: 'Rules' },

    { key: 'spin', label: 'Auto-rotate', min: 0, max: 0.8, step: 0.02, default: 0.12, unit: ' rad/s', group: 'View' },
    { key: 'trails', label: 'Trails', type: 'toggle', default: true, group: 'View' },
    { key: 'globe', label: 'Sphere', type: 'toggle', default: true, group: 'View' },
    { key: 'wire', label: 'Wireframe', type: 'toggle', default: true, group: 'View' },
  ],

  presets: [
    { name: 'Bands',    values: { separation: 1.5, alignment: 1.3, cohesion: 0.75, perception: 34, personal: 13, count: 190 } },
    { name: 'Vortices', values: { separation: 1.0, alignment: 2.6, cohesion: 0.35, perception: 28, personal: 9, count: 300 } },
    { name: 'One blob', values: { separation: 2.2, alignment: 0.2, cohesion: 2.0, perception: 60, personal: 18, count: 220 } },
    { name: 'Gas',      values: { separation: 2.6, alignment: 0.0, cohesion: 0.0, perception: 25, personal: 22, count: 160 } },
  ],

  init(params, rng) {
    const agents = [];
    for (let i = 0; i < params.count; i++) agents.push(spawn(rng, params));
    return {
      agents,
      camera: makeCamera({ azimuth: 0.6, elevation: 0.34, distance: 3.5 }),
      order: 0,
      clustering: 0,
      meanNeighbours: 0,
    };
  },

  sync(state, params, rng) {
    const a = state.agents;
    while (a.length < params.count) a.push(spawn(rng, params));
    if (a.length > params.count) a.length = params.count;
  },

  step(state, params, dt, rng) {
    if (!orbitFromPointer(state.camera, state.pointer)) {
      state.camera.azimuth += params.spin * dt;
    }

    const agents = state.agents;
    const n = agents.length;
    if (!n) return;

    const cosPercep = Math.cos(params.perception * DEG);
    const sepAngle = Math.min(params.personal, params.perception) * DEG;
    const maxSpeed = params.speed;
    const maxForce = params.speed * 3.5;

    let neighbourTotal = 0;

    // ── Pass 1: forces, from the current state ──
    for (let i = 0; i < n; i++) {
      const a = agents[i];
      const p = a.p;

      let sep = [0, 0, 0];
      let ali = [0, 0, 0];
      let coh = [0, 0, 0];
      let count = 0;

      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const b = agents[j];
        const c = dot(p, b.p);
        if (c < cosPercep || c > 0.999999) continue;

        count++;
        const ang = Math.acos(c > 1 ? 1 : c < -1 ? -1 : c);

        // Unit tangent at p pointing along the great circle toward b.
        const t = normalize(tangent(b.p, p));

        if (ang < sepAngle) {
          const push = 1 - ang / sepAngle;
          sep[0] -= t[0] * push; sep[1] -= t[1] * push; sep[2] -= t[2] * push;
        }

        // Parallel transport, approximated by projection into T_p.
        const vt = tangent(b.v, p);
        ali[0] += vt[0]; ali[1] += vt[1]; ali[2] += vt[2];

        coh[0] += b.p[0]; coh[1] += b.p[1]; coh[2] += b.p[2];
      }

      a.n = count;
      neighbourTotal += count;

      FORCE[0] = 0; FORCE[1] = 0; FORCE[2] = 0;
      if (count > 0) {
        steer(a, sep, params.separation, maxSpeed, maxForce, FORCE);
        steer(a, ali, params.alignment, maxSpeed, maxForce, FORCE);
        // Cohesion aims at the tangential direction of the neighbour centroid.
        steer(a, tangent(coh, p), params.cohesion, maxSpeed, maxForce, FORCE);
      }

      if (params.jitter > 0) {
        const j = params.jitter * maxForce;
        const noise = tangent([rng() - 0.5, rng() - 0.5, rng() - 0.5], p);
        FORCE[0] += noise[0] * j;
        FORCE[1] += noise[1] * j;
        FORCE[2] += noise[2] * j;
      }

      a.f = [FORCE[0], FORCE[1], FORCE[2]];
    }

    // ── Pass 2: integrate along geodesics ──
    let Lx = 0, Ly = 0, Lz = 0;
    let Px = 0, Py = 0, Pz = 0;
    const minSpeed = maxSpeed * 0.6;

    for (let i = 0; i < n; i++) {
      const a = agents[i];

      let v = [a.v[0] + a.f[0] * dt, a.v[1] + a.f[1] * dt, a.v[2] + a.f[2] * dt];
      v = tangent(v, a.p);                       // stay in the tangent plane
      let s = len(v);
      if (s < 1e-9) {
        // Degenerate: pick any tangent direction and carry on.
        let dir = tangent([1, 0, 0], a.p);
        if (len(dir) < 1e-6) dir = tangent([0, 0, 1], a.p);
        dir = normalize(dir);
        v = [dir[0] * minSpeed, dir[1] * minSpeed, dir[2] * minSpeed];
        s = minSpeed;
      } else if (s > maxSpeed) {
        const k = maxSpeed / s; v = [v[0] * k, v[1] * k, v[2] * k]; s = maxSpeed;
      } else if (s < minSpeed) {
        const k = minSpeed / s; v = [v[0] * k, v[1] * k, v[2] * k]; s = minSpeed;
      }

      // Exact geodesic flow: rotate p and v together about p × v.
      const axis = normalize(cross(a.p, v));
      const ang = s * dt;
      if (len(axis) > 0.5) {
        a.p = normalize(rotateAbout(a.p, axis, ang));
        v = rotateAbout(v, axis, ang);
      }
      a.v = tangent(v, a.p);

      const L = cross(a.p, a.v);
      Lx += L[0]; Ly += L[1]; Lz += L[2];
      Px += a.p[0]; Py += a.p[1]; Pz += a.p[2];

      const ax = normalize(L);
      a.hue = Math.round(110 - ax[2] * 90);      // colour by circulation axis

      const ti = (a.trailN % TRAIL) * 3;
      a.trail[ti] = a.p[0];
      a.trail[ti + 1] = a.p[1];
      a.trail[ti + 2] = a.p[2];
      a.trailN++;
    }

    // Normalised total angular momentum: 1 when everyone circulates together.
    state.order = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz) / (n * maxSpeed);
    state.clustering = Math.sqrt(Px * Px + Py * Py + Pz * Pz) / n;
    state.meanNeighbours = neighbourTotal / n;
  },

  clear(ctx, state, params, env) {
    ctx.fillStyle = (env.theme && env.theme.bg) || '#0b1121';
    ctx.fillRect(0, 0, env.width, env.height);
  },

  draw(ctx, state, params, env) {
    const scene = createScene(ctx, env, state.camera, { fadeSpan: 2.2 });

    if (params.globe) {
      scene.globe(1, {
        wire: params.wire,
        opacity: 0.92,
        lat: 5,
        lon: 8,
        wireAlpha: 0.45,
        rim: 'rgba(100,116,139,0.45)',
      });
    }

    const R = 1.012;   // just clear of the surface, so dots are not z-fought
    for (const a of state.agents) {
      const colour = `hsl(${a.hue}, 72%, 62%)`;

      if (params.trails && a.trailN > 1) {
        const n = Math.min(a.trailN, TRAIL);
        const start = a.trailN > TRAIL ? a.trailN - TRAIL : 0;
        const pts = [];
        for (let k = 0; k < n; k++) {
          const idx = ((start + k) % TRAIL) * 3;
          pts.push([a.trail[idx] * R, a.trail[idx + 2] * R, a.trail[idx + 1] * R]);
        }
        scene.polyline(pts, { color: colour, width: 1, alpha: 0.4 });
      }

      scene.point([a.p[0] * R, a.p[2] * R, a.p[1] * R], { r: 2.9, color: colour });
    }

    scene.labelPx(12, 12,
      `\\frac{\\big|\\sum_i p_i \\times v_i\\big|}{N v} = ${state.order.toFixed(3)}`,
      { id: 'order', anchor: 'top-left' });

    scene.render();
  },

  stats(state) {
    return [
      { label: 'Agents', value: state.agents.length },
      { label: 'Circulation |L|', value: state.order.toFixed(3) },
      { label: 'Clustering', value: state.clustering.toFixed(3) },
      { label: 'Mean neighbours', value: state.meanNeighbours.toFixed(1) },
    ];
  },
});
