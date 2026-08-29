/**
 * A small 3D layer for figures — projection, an orbit camera, and painter's
 * algorithm over the same 2D canvas everything else uses.
 *
 * Deliberately not WebGL. The figures this is for — a Bloch sphere, flocking
 * on a manifold, a phase portrait — are wireframes, points and arrows, and for
 * those the software path wins: it stays dependency-free, it draws crisp vector
 * lines instead of an aliased mesh, it keeps the model contract (a model still
 * only sees a 2D context), and it keeps runs reproducible. Reach for three.js
 * only when a figure genuinely needs lit meshes, shadows or GPU-scale geometry;
 * that would be a second renderer, not a change to this one.
 *
 * Depth is handled by sorting draw calls back-to-front. The trick that makes it
 * look solid: `globe()` fills the sphere's silhouette at the depth of its
 * centre, so wireframe behind the centre is painted before the fill and is
 * covered by it, while the front half is painted after.
 */

/* ── vectors ──────────────────────────────────────────────────────────────── */

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = a => Math.sqrt(dot(a, a));
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export function normalize(a) {
  const m = len(a);
  return m > 1e-12 ? [a[0] / m, a[1] / m, a[2] / m] : [0, 0, 0];
}

/** Rodrigues rotation of `v` about unit axis `k` by `angle`. */
export function rotateAbout(v, k, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const kv = cross(k, v);
  const kd = dot(k, v);
  return [
    v[0] * c + kv[0] * s + k[0] * kd * (1 - c),
    v[1] * c + kv[1] * s + k[1] * kd * (1 - c),
    v[2] * c + kv[2] * s + k[2] * kd * (1 - c),
  ];
}

/** Component of `v` tangent to the unit sphere at `p`. */
export function tangent(v, p) {
  const d = dot(v, p);
  return [v[0] - d * p[0], v[1] - d * p[1], v[2] - d * p[2]];
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ── camera ───────────────────────────────────────────────────────────────── */

export function makeCamera(opts = {}) {
  return {
    azimuth: opts.azimuth == null ? 0.6 : opts.azimuth,
    elevation: opts.elevation == null ? 0.32 : opts.elevation,
    distance: opts.distance == null ? 3.4 : opts.distance,
    fov: opts.fov == null ? 45 : opts.fov,
    target: opts.target || [0, 0, 0],
    zoom: opts.zoom == null ? 1 : opts.zoom,
    _drag: null,
  };
}

/**
 * Drag-to-orbit. Call from `step` (not `onPointer`) so the release is seen:
 * the engine keeps `pointer.down` current every frame.
 *
 * @returns true while the reader is actively dragging.
 */
export function orbitFromPointer(camera, pointer, opts = {}) {
  const speed = opts.speed == null ? 0.008 : opts.speed;
  if (!pointer || !pointer.down) {
    camera._drag = null;
    return false;
  }
  if (!camera._drag) {
    camera._drag = { x: pointer.x, y: pointer.y };
    return true;
  }
  const dx = pointer.x - camera._drag.x;
  const dy = pointer.y - camera._drag.y;
  camera._drag.x = pointer.x;
  camera._drag.y = pointer.y;
  camera.azimuth -= dx * speed;
  camera.elevation = clamp(camera.elevation + dy * speed, -1.45, 1.45);
  return true;
}

function basis(cam) {
  const ce = Math.cos(cam.elevation);
  const se = Math.sin(cam.elevation);
  const ca = Math.cos(cam.azimuth);
  const sa = Math.sin(cam.azimuth);
  const dir = [ce * sa, se, ce * ca];              // target → eye
  const eye = add(cam.target, scale(dir, cam.distance));
  const forward = scale(dir, -1);                  // eye → target
  let right = cross(forward, [0, 1, 0]);
  right = len(right) < 1e-6 ? [1, 0, 0] : normalize(right);
  const up = cross(right, forward);
  return { eye, forward, right, up };
}

/* ── scene ────────────────────────────────────────────────────────────────── */

export function createScene(ctx, env, camera, opts = {}) {
  const theme = env.theme || {};
  const { eye, forward, right, up } = basis(camera);

  const cx = env.width / 2 + (opts.offsetX || 0);
  const cy = env.height / 2 + (opts.offsetY || 0);
  const f =
    ((Math.min(env.width, env.height) / 2) /
      Math.tan((camera.fov * Math.PI) / 360)) * camera.zoom;

  const NEAR = 0.05;
  const items = [];
  const overlays = [];
  const labels = opts.labels || null;

  /** World point → screen. `z` is view depth: larger is farther. */
  function project(p) {
    const vx = p[0] - eye[0];
    const vy = p[1] - eye[1];
    const vz = p[2] - eye[2];
    const z = vx * forward[0] + vy * forward[1] + vz * forward[2];
    if (z <= NEAR) return { ok: false, x: 0, y: 0, z, s: 0 };
    const xr = vx * right[0] + vy * right[1] + vz * right[2];
    const yu = vx * up[0] + vy * up[1] + vz * up[2];
    const s = f / z;
    return { ok: true, x: cx + xr * s, y: cy - yu * s, z, s };
  }

  /** 1 at the near edge of the scene, `min` at the far edge — cheap depth cue. */
  function fade(z, min = 0.18, span = opts.fadeSpan || 2) {
    const t = (z - (camera.distance - span / 2)) / span;
    return clamp(1 - t, min, 1);
  }

  const scene = {
    ctx, project, fade, camera, theme, f, cx, cy, eye, forward, right, up,

    /** Queue a draw call at a given view depth. */
    add(z, fn) { items.push({ z, fn }); },

    /** Queue a draw call that always paints last, in screen space. */
    overlay(fn) { overlays.push(fn); },

    point(p, o = {}) {
      const q = project(p);
      if (!q.ok) return;
      const r = (o.r == null ? 3 : o.r) * (o.scaled === false ? 1 : q.s / f * camera.distance);
      const a = (o.alpha == null ? 1 : o.alpha) * (o.fade === false ? 1 : fade(q.z));
      scene.add(q.z, () => {
        ctx.globalAlpha = a;
        ctx.fillStyle = o.color || theme.accent || '#fb923c';
        ctx.beginPath();
        ctx.arc(q.x, q.y, Math.max(0.4, r), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    },

    segment(a3, b3, o = {}) {
      const a = project(a3);
      const b = project(b3);
      if (!a.ok || !b.ok) return;
      const z = (a.z + b.z) / 2;
      const alpha = (o.alpha == null ? 1 : o.alpha) * (o.fade === false ? 1 : fade(z));
      scene.add(z, () => {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = o.color || theme.track || '#64748b';
        ctx.lineWidth = o.width || 1;
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (o.dash) ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      });
    },

    /** A polyline, sorted per segment so it can pass behind other geometry. */
    path(points, o = {}) {
      for (let i = 1; i < points.length; i++) {
        const t = o.taper ? i / (points.length - 1) : 1;
        scene.segment(points[i - 1], points[i], {
          ...o,
          alpha: (o.alpha == null ? 1 : o.alpha) * t,
        });
      }
    },

    /**
     * A polyline drawn as ONE sorted item at its mean depth. Use for trails,
     * where hundreds of per-segment items would swamp the sort; use `path`
     * when the line must genuinely pass behind other geometry.
     */
    polyline(points, o = {}) {
      const pts = [];
      let zsum = 0;
      for (const p of points) {
        const q = project(p);
        if (!q.ok) continue;
        pts.push(q);
        zsum += q.z;
      }
      if (pts.length < 2) return;
      const z = zsum / pts.length;
      const alpha = (o.alpha == null ? 1 : o.alpha) * (o.fade === false ? 1 : fade(z));
      scene.add(z, () => {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = o.color || theme.track || '#64748b';
        ctx.lineWidth = o.width || 1;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
          else ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    },

    arrow(from, to, o = {}) {
      const a = project(from);
      const b = project(to);
      if (!a.ok || !b.ok) return;
      const z = (a.z + b.z) / 2;
      const alpha = (o.alpha == null ? 1 : o.alpha) * (o.fade === false ? 1 : fade(z));
      const color = o.color || theme.accent || '#fb923c';
      const head = (o.head == null ? 9 : o.head) * (b.s / f) * camera.distance;
      scene.add(z, () => {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = o.width || 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const h = Math.max(4, head);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - h * Math.cos(ang - 0.4), b.y - h * Math.sin(ang - 0.4));
        ctx.lineTo(b.x - h * Math.cos(ang + 0.4), b.y - h * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    },

    text(p, str, o = {}) {
      const q = project(p);
      if (!q.ok) return;
      const alpha = (o.alpha == null ? 1 : o.alpha) * (o.fade === false ? 1 : fade(q.z, 0.35));
      scene.add(o.onTop ? -Infinity : q.z, () => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = o.color || theme.muted || '#94a3b8';
        ctx.font = o.font || '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = o.align || 'center';
        ctx.textBaseline = o.baseline || 'middle';
        ctx.fillText(str, q.x + (o.dx || 0), q.y + (o.dy || 0));
        ctx.globalAlpha = 1;
      });
    },

    /**
     * A KaTeX label pinned to a world point. Queued for the HTML overlay rather
     * than drawn, and faded with depth like everything else, so a label on the
     * far side of a sphere recedes instead of floating on top of it.
     */
    label(p, tex, o = {}) {
      if (!labels || !tex) return;
      const q = project(p);
      if (!q.ok) return;
      labels.push({
        id: o.id || `scene-${labels.length}`,
        tex,
        x: q.x + (o.dx || 0),
        y: q.y + (o.dy || 0),
        anchor: o.anchor || 'center',
        color: o.color,
        size: o.size,
        chip: o.chip === true,
        opacity: o.fade === false ? 1 : fade(q.z, 0.3),
      });
    },

    /** The same, positioned in canvas pixels — for corner cards and HUDs. */
    labelPx(x, y, tex, o = {}) {
      if (!labels || !tex) return;
      labels.push({
        id: o.id || `hud-${labels.length}`,
        tex,
        x, y,
        anchor: o.anchor || 'top-left',
        color: o.color,
        size: o.size,
        chip: o.chip !== false,
      });
    },

    /** Circle of radius `r` about the origin in the plane normal to `n`. */
    circle(n, r, o = {}) {
      const k = normalize(n);
      let u = Math.abs(k[0]) < 0.9 ? cross(k, [1, 0, 0]) : cross(k, [0, 1, 0]);
      u = normalize(u);
      const v = cross(k, u);
      const N = o.segments || 72;
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const c = Math.cos(a) * r;
        const s = Math.sin(a) * r;
        pts.push([
          u[0] * c + v[0] * s,
          u[1] * c + v[1] * s,
          u[2] * c + v[2] * s,
        ]);
      }
      scene.path(pts, o);
    },

    /**
     * A sphere: filled silhouette at the depth of its centre, plus a lat/long
     * wireframe. The fill is what gives the wireframe a front and a back.
     */
    globe(radius = 1, o = {}) {
      const c = project([0, 0, 0]);
      if (c.ok) {
        const rpx = radius * c.s;
        const opacity = o.opacity == null ? 0.82 : o.opacity;
        if (opacity > 0) {
          scene.add(c.z, () => {
            const g = ctx.createRadialGradient(
              c.x - rpx * 0.35, c.y - rpx * 0.4, rpx * 0.1,
              c.x, c.y, rpx
            );
            g.addColorStop(0, o.fillNear || 'rgba(30,41,59,0.95)');
            g.addColorStop(1, o.fillFar || 'rgba(11,17,33,0.95)');
            ctx.globalAlpha = opacity;
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(c.x, c.y, rpx, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = o.rim || 'rgba(71,85,105,0.55)';
            ctx.lineWidth = 1;
            ctx.stroke();
          });
        }
      }

      const wire = o.wire === undefined ? true : o.wire;
      if (!wire) return;
      const color = o.wireColor || theme.grid || 'rgba(51,65,85,0.6)';
      const lat = o.lat == null ? 5 : o.lat;
      const lon = o.lon == null ? 8 : o.lon;
      const seg = o.segments == null ? 48 : o.segments;

      for (let i = 1; i <= lat; i++) {
        const phi = (i / (lat + 1)) * Math.PI;
        const r = Math.sin(phi) * radius;
        const y = Math.cos(phi) * radius;
        const pts = [];
        for (let j = 0; j <= seg; j++) {
          const a = (j / seg) * Math.PI * 2;
          pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
        }
        scene.path(pts, { color, width: 1, alpha: o.wireAlpha == null ? 0.55 : o.wireAlpha });
      }
      for (let i = 0; i < lon; i++) {
        const a = (i / lon) * Math.PI;
        const pts = [];
        for (let j = 0; j <= seg; j++) {
          const t = (j / seg) * Math.PI * 2;
          pts.push([
            Math.cos(a) * Math.sin(t) * radius,
            Math.cos(t) * radius,
            Math.sin(a) * Math.sin(t) * radius,
          ]);
        }
        scene.path(pts, { color, width: 1, alpha: o.wireAlpha == null ? 0.55 : o.wireAlpha });
      }
    },

    /** Sort back-to-front and paint. */
    render() {
      items.sort((a, b) => b.z - a.z);
      for (const it of items) it.fn();
      items.length = 0;
      for (const fn of overlays) fn();
      overlays.length = 0;
    },
  };

  return scene;
}

export default createScene;
