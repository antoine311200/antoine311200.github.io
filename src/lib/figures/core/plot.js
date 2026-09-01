/**
 * Canvas plotting primitives.
 *
 * Enough of a plotting layer to draw a clean, labelled pair of axes and some
 * curves on top — deliberately not a charting library. Everything works in
 * data coordinates and converts on the way out, so a model writes `y = f(x)`
 * and never thinks in pixels.
 *
 * Colours come from `env.theme`, which the engine reads from the figure's CSS
 * custom properties, so plots follow the host page's palette.
 */

const DEFAULT_PADDING = { top: 16, right: 18, bottom: 30, left: 48 };

/** "Nice" round tick values covering [a, b], about `count` of them. */
export function niceTicks(a, b, count = 6) {
  if (!isFinite(a) || !isFinite(b) || a === b) return [a];
  const span = b - a;
  const raw = span / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const stepMul = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  const step = stepMul * mag;
  const first = Math.ceil(a / step) * step;
  const out = [];
  for (let v = first; v <= b + step * 1e-6; v += step) {
    out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
  }
  return out;
}

function formatTick(v, step) {
  if (v === 0) return '0';
  const decimals = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step)));
  const s = v.toFixed(decimals);
  return s.replace(/\.?0+$/, m => (m.includes('.') ? '' : m));
}

/** `{ width, height }` (an env) or `{ x, y, w, h }` (a rect) → a rect. */
function toRect(region) {
  if (!region) return { x: 0, y: 0, w: 0, h: 0 };
  if (region.w !== undefined && region.h !== undefined) return region;
  return { x: 0, y: 0, w: region.width, h: region.height };
}

function splitInto(rect, node, out) {
  if (node.id) out[node.id] = rect;

  const kids = node.children;
  if (!kids || !kids.length) return;

  const column = node.dir === 'column';
  const gap = node.gap == null ? 8 : node.gap;
  const weights = kids.map(k => (k.flex == null ? 1 : k.flex));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const avail = (column ? rect.h : rect.w) - gap * (kids.length - 1);

  let pos = column ? rect.y : rect.x;
  kids.forEach((kid, i) => {
    const size = (avail * weights[i]) / total;
    splitInto(
      column
        ? { x: rect.x, y: pos, w: rect.w, h: size }
        : { x: pos, y: rect.y, w: size, h: rect.h },
      kid,
      out
    );
    pos += size + gap;
  });
}

/**
 * Nested panel layout — rows and columns to any depth.
 *
 * `panelRects` below covers the uniform-grid case; this covers everything else.
 * A node is `{ dir: 'row' | 'column', gap, children: [...] }`, a child may
 * carry `flex` and an `id`, and any child may itself have children:
 *
 *   const L = layout(env, {
 *     dir: 'row', gap: 10,
 *     children: [
 *       { id: 'sim', flex: 1.2 },                       // full height, left
 *       { dir: 'column', flex: 1, gap: 8, children: [
 *         { id: 'sim2', flex: 1 },                      // right, top
 *         { dir: 'row', flex: 1, gap: 8, children: [
 *           { id: 'left' }, { id: 'right' },            // right, bottom pair
 *         ] },
 *       ] },
 *     ],
 *   });
 *   // L.sim, L.sim2, L.left, L.right — each a { x, y, w, h } in CSS pixels
 *
 * The first argument is an env or any rect, so a layout can be nested inside a
 * region computed by an outer one.
 */
export function layout(region, spec) {
  const out = {};
  splitInto(toRect(region), spec, out);
  return out;
}

/**
 * Split a region into a grid of sub-regions, for figures that want more than
 * one plot — a signal and its spectrum, a phase portrait and a time series, a
 * lattice above its order parameter. Takes an env or any rect.
 *
 *   const [top, bottom] = panelRects(env, { rows: 2, ratios: [2, 1] });
 *   const p1 = createPlot(ctx, env, { rect: top, xDomain, yDomain });
 *
 * A rect is plain `{ x, y, w, h }` in CSS pixels, so a panel can also be
 * painted into directly — it does not have to become a plot.
 */
export function panelRects(region, opts = {}) {
  const env = toRect(region);
  const rows = opts.rows || 1;
  const cols = opts.cols || 1;
  const gap = opts.gap == null ? 6 : opts.gap;
  const ratios = opts.ratios && opts.ratios.length === rows
    ? opts.ratios
    : new Array(rows).fill(1);
  const colRatios = opts.colRatios && opts.colRatios.length === cols
    ? opts.colRatios
    : new Array(cols).fill(1);

  const totalR = ratios.reduce((a, b) => a + b, 0);
  const totalC = colRatios.reduce((a, b) => a + b, 0);
  const usableH = env.h - gap * (rows - 1);
  const usableW = env.w - gap * (cols - 1);

  const out = [];
  let y = env.y;
  for (let r = 0; r < rows; r++) {
    const h = (usableH * ratios[r]) / totalR;
    let x = env.x;
    for (let c = 0; c < cols; c++) {
      const w = (usableW * colRatios[c]) / totalC;
      out.push({ x, y, w, h });
      x += w + gap;
    }
    y += h + gap;
  }
  return out;
}

export function createPlot(ctx, env, opts = {}) {
  const theme = env.theme || {};
  const labels = opts.labels || null;
  const pad = { ...DEFAULT_PADDING, ...(opts.padding || {}) };
  const [xa, xb] = opts.xDomain;
  const [ya, yb] = opts.yDomain;

  // A plot normally owns the whole canvas, but `rect` confines it to a
  // sub-region so several plots can share one figure. See `panelRects`.
  const region = opts.rect || { x: 0, y: 0, w: env.width, h: env.height };

  const left = region.x + pad.left;
  const right = region.x + region.w - pad.right;
  const top = region.y + pad.top;
  const bottom = region.y + region.h - pad.bottom;
  const innerW = Math.max(1, right - left);
  const innerH = Math.max(1, bottom - top);

  const xToPx = x => left + ((x - xa) / (xb - xa || 1)) * innerW;
  const yToPx = y => bottom - ((y - ya) / (yb - ya || 1)) * innerH;
  const pxToX = px => xa + ((px - left) / innerW) * (xb - xa);

  const font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
  const grid = theme.grid || 'rgba(51,65,85,0.35)';
  const axis = theme.faint || '#64748b';
  const label = theme.muted || '#94a3b8';

  const plot = {
    ctx, left, right, top, bottom, innerW, innerH,
    xDomain: [xa, xb], yDomain: [ya, yb],
    xToPx, yToPx, pxToX, theme,

    /** Grid, axes, ticks and axis titles. */
    frame({ xLabel, yLabel, xTicks, yTicks } = {}) {
      const xs = xTicks || niceTicks(xa, xb, Math.max(2, Math.round(innerW / 90)));
      const ys = yTicks || niceTicks(ya, yb, Math.max(2, Math.round(innerH / 46)));
      const xStep = xs.length > 1 ? Math.abs(xs[1] - xs[0]) : 1;
      const yStep = ys.length > 1 ? Math.abs(ys[1] - ys[0]) : 1;

      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = grid;
      ctx.beginPath();
      for (const x of xs) {
        const px = Math.round(xToPx(x)) + 0.5;
        if (px < left - 1 || px > right + 1) continue;
        ctx.moveTo(px, top); ctx.lineTo(px, bottom);
      }
      for (const y of ys) {
        const py = Math.round(yToPx(y)) + 0.5;
        if (py < top - 1 || py > bottom + 1) continue;
        ctx.moveTo(left, py); ctx.lineTo(right, py);
      }
      ctx.stroke();

      // zero lines, drawn brighter than the grid
      ctx.strokeStyle = theme.track || 'rgba(71,85,105,0.7)';
      ctx.beginPath();
      if (ya < 0 && yb > 0) {
        const py = Math.round(yToPx(0)) + 0.5;
        ctx.moveTo(left, py); ctx.lineTo(right, py);
      }
      if (xa < 0 && xb > 0) {
        const px = Math.round(xToPx(0)) + 0.5;
        ctx.moveTo(px, top); ctx.lineTo(px, bottom);
      }
      ctx.stroke();

      ctx.font = font;
      ctx.fillStyle = axis;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const x of xs) {
        const px = xToPx(x);
        if (px < left - 1 || px > right + 1) continue;
        ctx.fillText(formatTick(x, xStep), px, bottom + 6);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const y of ys) {
        const py = yToPx(y);
        if (py < top - 1 || py > bottom + 1) continue;
        ctx.fillText(formatTick(y, yStep), left - 7, py);
      }

      ctx.fillStyle = label;
      if (xLabel) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(xLabel, right, region.y + region.h - 2);
      }
      if (yLabel) {
        ctx.save();
        ctx.translate(region.x + 11, top);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    },

    /** Run `cb` with drawing clipped to the plot rectangle. */
    clip(cb) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, innerW, innerH);
      ctx.clip();
      cb();
      ctx.restore();
    },

    /** Sample y = fn(x) across the x-domain and stroke it. */
    curve(fn, { color = '#fb923c', width = 1.8, dash = null, samples = 0, alpha = 1 } = {}) {
      const n = samples || Math.max(64, Math.min(1400, Math.round(innerW)));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      let penDown = false;
      for (let i = 0; i <= n; i++) {
        const x = xa + ((xb - xa) * i) / n;
        const y = fn(x);
        if (!isFinite(y)) { penDown = false; continue; }
        const px = xToPx(x);
        const py = yToPx(y);
        // Guard against enormous excursions blowing up the path.
        if (py < top - innerH * 4 || py > bottom + innerH * 4) { penDown = false; continue; }
        if (penDown) ctx.lineTo(px, py);
        else { ctx.moveTo(px, py); penDown = true; }
      }
      ctx.stroke();
      ctx.restore();
    },

    /** Stroke an explicit list of [x, y] data points. */
    line(points, { color = '#fb923c', width = 1.6, dash = null, alpha = 1 } = {}) {
      if (!points || points.length < 2) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const px = xToPx(points[i][0]);
        const py = yToPx(points[i][1]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    },

    dot(x, y, { color = '#fb923c', r = 3, ring = false } = {}) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(xToPx(x), yToPx(y), r, 0, Math.PI * 2);
      ctx.fill();
      if (ring) {
        ctx.strokeStyle = theme.bg || '#0b1121';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    },

    vline(x, { color = 'rgba(148,163,184,0.5)', dash = [3, 3], width = 1 } = {}) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash(dash);
      const px = Math.round(xToPx(x)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, bottom);
      ctx.stroke();
      ctx.restore();
    },

    /**
     * A KaTeX label anchored in data coordinates.
     *
     * Canvas cannot draw KaTeX, so this queues the label for the HTML overlay
     * the figure shell paints on top of the stage — real KaTeX fonts, real
     * MathML for assistive tech, crisp at any pixel ratio.
     */
    label(x, y, tex, o = {}) {
      if (!labels || !tex) return;
      labels.push({
        id: o.id || `plot-${labels.length}`,
        tex,
        x: xToPx(x) + (o.dx || 0),
        y: yToPx(y) + (o.dy || 0),
        anchor: o.anchor || 'center',
        color: o.color,
        size: o.size,
        chip: o.chip === true,
      });
    },

    /** The same, positioned in canvas pixels — for corner cards and HUDs. */
    labelPx(x, y, tex, o = {}) {
      if (!labels || !tex) return;
      labels.push({
        id: o.id || `hud-${labels.length}`,
        tex,
        x: x + (o.dx || 0),
        y: y + (o.dy || 0),
        anchor: o.anchor || 'top-left',
        color: o.color,
        size: o.size,
        chip: o.chip !== false,
      });
    },

    /** Small canvas text tag anchored in data coordinates. */
    tag(x, y, text, { color = '#94a3b8', align = 'left', baseline = 'bottom', dx = 4, dy = -4 } = {}) {
      ctx.save();
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillText(text, xToPx(x) + dx, yToPx(y) + dy);
      ctx.restore();
    },
  };

  return plot;
}

/**
 * Smoothed automatic y-range.
 *
 * Recomputing min/max every frame makes a curve jitter as it grows; this eases
 * the bounds toward the target so the axis settles instead of twitching.
 */
export function autoRange(state, key, lo, hi, { pad = 0.12, ease = 0.12, symmetric = false } = {}) {
  let a = lo;
  let b = hi;
  if (!isFinite(a) || !isFinite(b)) { a = -1; b = 1; }
  if (symmetric) { const m = Math.max(Math.abs(a), Math.abs(b)); a = -m; b = m; }
  const span = (b - a) || 1;
  a -= span * pad;
  b += span * pad;

  const prev = state[key];
  if (!prev) { state[key] = [a, b]; return state[key]; }
  state[key] = [
    prev[0] + (a - prev[0]) * ease,
    prev[1] + (b - prev[1]) * ease,
  ];
  return state[key];
}
