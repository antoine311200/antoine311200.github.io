import { makeRng, nextSeed } from './rng';
import { needsReinit } from './params';

/**
 * The simulation engine: canvas, clock, and loop. No React, no JSX — it can be
 * driven from anywhere, and the React layer is a thin binding over it.
 *
 * Responsibilities:
 *  · size the canvas for the device pixel ratio and keep it sized
 *  · run a fixed-timestep loop so behaviour is identical at 60Hz and 144Hz
 *  · stop stepping when the figure scrolls out of view
 *  · own the seeded RNG, so reset() reproduces a run exactly
 *  · translate pointer events into simulation coordinates
 *  · hold the view transform, so a reader can zoom into a dense figure
 */

const MAX_FRAME = 0.25;   // clamp after a tab switch instead of spiralling
const BASE_CATCHUP = 5;   // steps per rendered frame at 1x speed

/**
 * Zoom settings, from `model.zoom` or the `zoom` option:
 *
 *   zoom: true                       // 1× … 4×
 *   zoom: { max: 8 }                 // deeper
 *   zoom: { max: 6, pan: false }     // zoom, but no dragging
 *
 * The minimum is never below 1: a figure is drawn to fill its frame, so
 * zooming *out* would only add empty margins.
 */
function normalizeZoom(z) {
  if (!z) return null;
  const o = z === true ? {} : z;
  const min = Math.max(1, o.min == null ? 1 : o.min);
  return {
    min,
    max: Math.max(min, o.max == null ? 4 : o.max),
    step: o.step || 1.6,
    wheel: o.wheel !== false,
    pan: o.pan !== false,
  };
}

export class Engine {
  constructor(canvas, model, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.model = model;
    this.params = { ...(options.params || {}) };
    this.speed = options.speed == null ? 1 : options.speed;
    this.running = options.autoplay !== false;
    this.seed = options.seed || 1;

    this.state = null;
    this.rng = null;
    this.time = 0;
    this.size = { w: 0, h: 0 };
    this.pointer = { x: 0, y: 0, active: false, down: false };
    this.visible = true;

    // The view transform. Drawing is untouched by it: the model always draws
    // as if it owned the whole frame, and the engine scales the result.
    this.zoom = normalizeZoom(options.zoom === undefined ? model.zoom : options.zoom);
    this.view = { scale: 1, x: 0, y: 0 };

    // Rebuilt every frame by the model; drained by the React overlay, because
    // KaTeX is HTML and canvas cannot draw it.
    this.labels = [];

    this.onFps = options.onFps || null;
    this.onLabels = options.onLabels || null;
    this.onStats = options.onStats || null;
    this.onTime = options.onTime || null;
    this.onView = options.onView || null;

    this._dt = 1 / (model.rate || 60);
    this._raf = 0;
    this._dead = false;
    this._resizeQueued = false;
    this._last = 0;
    this._acc = 0;
    this._pending = 0;      // queued single steps
    this._frames = 0;
    this._fpsAt = 0;
    this._statsAt = 0;

    this._onFrame = this._onFrame.bind(this);
    this._attach();
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  start() {
    if (!this._raf) this._raf = requestAnimationFrame(this._onFrame);
  }

  destroy() {
    this._dead = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._ro && this._ro.disconnect();
    this._io && this._io.disconnect();
    const c = this.canvas;
    c.removeEventListener('pointermove', this._pointerMove);
    c.removeEventListener('pointerdown', this._pointerDown);
    c.removeEventListener('pointerup', this._pointerUp);
    c.removeEventListener('pointerleave', this._pointerLeave);
    c.removeEventListener('pointercancel', this._pointerUp);
    c.removeEventListener('wheel', this._wheel);
    c.removeEventListener('dblclick', this._dblClick);
  }

  // ── controls ──────────────────────────────────────────────────────────────

  setRunning(running) { this.running = running; if (!running) this._acc = 0; }
  play()   { this.setRunning(true); }
  pause()  { this.setRunning(false); }
  toggle() { this.setRunning(!this.running); }

  /** Advance exactly one simulation step while paused. */
  stepOnce(n = 1) { this._pending += n; }

  setSpeed(speed) { this.speed = speed; }

  /** Same seed: an identical rerun of what the reader just watched. */
  reset() {
    this.state = null;
    this.time = 0;
    this._acc = 0;
    this._pending = 0;
  }

  /** A different draw from the same distribution. */
  shuffle() {
    this.seed = nextSeed(this.seed);
    this.reset();
  }

  setParams(next) {
    const prev = this.params;
    this.params = next;
    if (needsReinit(this.model.params, prev, next)) this.reset();
  }

  /** Run a model-declared action (Clear, Randomise, Perturb…). */
  runAction(id) {
    const action = (this.model.actions || []).find(a => a.id === id);
    if (!action || !this.state) return;
    action.run(this.state, this.params, this.rng, this._env());
  }

  getState() { return this.state; }

  // ── view ──────────────────────────────────────────────────────────────────

  canZoom() { return !!this.zoom; }

  /**
   * Multiply the zoom, keeping the point (cx, cy) of the frame where it is —
   * the behaviour a reader expects from a wheel or a pinch.
   */
  zoomAt(factor, cx, cy) {
    if (!this.zoom) return;
    const v = this.view;
    const from = v.scale;
    const to = Math.min(this.zoom.max, Math.max(this.zoom.min, from * factor));
    if (to === from) return;
    v.x = cx - ((cx - v.x) * to) / from;
    v.y = cy - ((cy - v.y) * to) / from;
    v.scale = to;
    this._clampView();
    this._emitView();
  }

  /** Zoom about the middle of the frame — what the toolbar buttons do. */
  zoomBy(factor) { this.zoomAt(factor, this.size.w / 2, this.size.h / 2); }

  panBy(dx, dy) {
    if (!this.zoom) return;
    this.view.x += dx;
    this.view.y += dy;
    this._clampView();
    this._emitView();
  }

  resetView() {
    if (!this.zoom) return;
    this.view = { scale: 1, x: 0, y: 0 };
    this._emitView();
  }

  /**
   * The limit half of "zoomable, with limits": the scale stays inside
   * [min, max] and the pan can never expose an edge, so the frame is always
   * completely covered by the drawing.
   */
  _clampView() {
    if (!this.zoom) return;
    const v = this.view;
    v.scale = Math.min(this.zoom.max, Math.max(this.zoom.min, v.scale));
    const minX = Math.min(0, this.size.w * (1 - v.scale));
    const minY = Math.min(0, this.size.h * (1 - v.scale));
    v.x = Math.min(0, Math.max(minX, v.x));
    v.y = Math.min(0, Math.max(minY, v.y));
  }

  _emitView() {
    if (this.zoom && this.zoom.pan) {
      this.canvas.style.cursor = this.view.scale > 1 ? 'grab' : '';
    }
    if (this.onView) this.onView({ ...this.view, min: this.zoom.min, max: this.zoom.max });
  }

  // ── internals ─────────────────────────────────────────────────────────────

  _env() {
    return { width: this.size.w, height: this.size.h, theme: this.theme, view: this.view };
  }

  /**
   * Canvas drawing cannot use CSS variables, so the palette is read once from
   * the figure's computed style and handed to models through `env.theme`.
   * Plots therefore follow whatever the host page has themed the figure to.
   */
  _readTheme() {
    const fallback = {
      bg: '#0b1121', fg: '#e2e8f0', muted: '#94a3b8', faint: '#64748b',
      track: 'rgba(71,85,105,0.7)', grid: 'rgba(51,65,85,0.35)', accent: '#fb923c',
    };
    try {
      const cs = getComputedStyle(this.canvas);
      const read = (name, fb) => (cs.getPropertyValue(name) || '').trim() || fb;
      this.theme = {
        bg:     read('--figx-bg', fallback.bg),
        fg:     read('--figx-fg', fallback.fg),
        muted:  read('--figx-muted', fallback.muted),
        faint:  read('--figx-faint', fallback.faint),
        track:  read('--figx-track', fallback.track),
        grid:   read('--figx-grid', fallback.grid),
        accent: read('--figx-accent', fallback.accent),
      };
    } catch (err) {
      this.theme = fallback;
    }
  }

  _attach() {
    const canvas = this.canvas;

    const applyResize = () => {
      if (this._dead) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);

      // Nothing to do is the common case once a figure has settled.
      if (w === this.size.w && h === this.size.h
        && canvas.width === bw && canvas.height === bh) return;

      canvas.width = bw;
      canvas.height = bh;
      // Draw in CSS pixels; the backing store carries the extra resolution.
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.size = { w, h };
      // A smaller frame can leave a pan that now exposes an edge.
      this._clampView();
    };

    // Resizing the canvas from inside the ResizeObserver callback is what
    // provokes "ResizeObserver loop completed with undelivered notifications"
    // — a benign browser notice, but one the CRA dev overlay escalates to a
    // full-screen error. Coalescing into the next frame keeps the mutation out
    // of the delivery loop, and entering or leaving fullscreen (which resizes
    // frame, stage and canvas at once) stops firing it.
    this._resize = () => {
      if (this._resizeQueued || this._dead) return;
      this._resizeQueued = true;
      requestAnimationFrame(() => {
        this._resizeQueued = false;
        applyResize();
      });
    };

    applyResize();
    this._readTheme();

    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(this._resize);
      this._ro.observe(canvas);
    }

    // Several live figures in one article is a hot phone; only the visible
    // ones are allowed to burn frames.
    if (typeof IntersectionObserver !== 'undefined') {
      this._io = new IntersectionObserver(
        ([entry]) => { this.visible = entry.isIntersecting; },
        { rootMargin: '150px' }
      );
      this._io.observe(canvas);
    }

    const at = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    // A model draws — and thinks — in unzoomed frame coordinates, so pointer
    // positions are mapped back through the view before they reach it.
    const toModel = (p) => ({
      x: (p.x - this.view.x) / this.view.scale,
      y: (p.y - this.view.y) / this.view.scale,
    });
    const dispatch = () => {
      if (this.model.onPointer && this.state) {
        this.model.onPointer(this.state, this.pointer, this.params, this.rng);
      }
    };

    // Live pointers, for pinch. Two fingers zoom; one drags.
    const pts = new Map();
    this._pinch = null;
    this._drag = null;

    const canPan = (e) => this.zoom && this.zoom.pan && this.view.scale > 1
      // A model that handles the pointer keeps it; hold shift to pan instead.
      && (!this.model.onPointer || e.shiftKey);

    this._pointerMove = (e) => {
      const p = at(e);
      if (pts.has(e.pointerId)) pts.set(e.pointerId, p);

      if (this._pinch && pts.size >= 2) {
        const [a, b] = Array.from(pts.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (this._pinch.dist > 1) this.zoomAt(dist / this._pinch.dist, mid.x, mid.y);
        this.panBy(mid.x - this._pinch.mid.x, mid.y - this._pinch.mid.y);
        this._pinch = { dist, mid };
        return;
      }
      if (this._drag) {
        this.panBy(p.x - this._drag.x, p.y - this._drag.y);
        this._drag = p;
        return;
      }

      const m = toModel(p);
      this.pointer = { ...this.pointer, x: m.x, y: m.y, active: true };
      if (this.pointer.down) dispatch();
    };

    this._pointerDown = (e) => {
      const p = at(e);
      pts.set(e.pointerId, p);
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      }

      if (this.zoom && pts.size === 2) {
        const [a, b] = Array.from(pts.values());
        this._pinch = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        };
        this._drag = null;
        this.pointer = { ...this.pointer, down: false };
        return;
      }

      if (canPan(e)) {
        this._drag = p;
        canvas.style.cursor = 'grabbing';
        return;
      }

      const m = toModel(p);
      this.pointer = { x: m.x, y: m.y, active: true, down: true };
      dispatch();
    };

    this._pointerUp = (e) => {
      if (e && e.pointerId !== undefined) pts.delete(e.pointerId);
      if (pts.size < 2) this._pinch = null;
      if (this._drag) {
        this._drag = null;
        canvas.style.cursor = this.view.scale > 1 ? 'grab' : '';
      }
      this.pointer = { ...this.pointer, down: false };
    };

    this._pointerLeave = (e) => {
      this._pointerUp(e);
      this.pointer = { ...this.pointer, active: false, down: false };
    };

    // Plain wheel belongs to the page — hijacking it inside an article is
    // hostile. A trackpad pinch arrives as ctrl+wheel, which *is* the gesture
    // a reader means by "zoom", so that one is taken.
    this._wheel = (e) => {
      if (!this.zoom || !this.zoom.wheel) return;
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const p = at(e);
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
      this.zoomAt(Math.exp((-e.deltaY * unit) / 260), p.x, p.y);
    };

    this._dblClick = (e) => {
      if (!this.zoom) return;
      const p = at(e);
      const z = this.zoom.step;
      this.zoomAt(e.shiftKey || e.altKey ? 1 / z : z, p.x, p.y);
    };

    canvas.addEventListener('pointermove', this._pointerMove, { passive: true });
    canvas.addEventListener('pointerdown', this._pointerDown, { passive: true });
    canvas.addEventListener('pointerup', this._pointerUp, { passive: true });
    canvas.addEventListener('pointercancel', this._pointerUp, { passive: true });
    canvas.addEventListener('pointerleave', this._pointerLeave, { passive: true });

    if (this.zoom) {
      canvas.addEventListener('wheel', this._wheel, { passive: false });
      canvas.addEventListener('dblclick', this._dblClick);
      // Let a vertical swipe scroll the page as usual, and keep the horizontal
      // and multi-touch gestures for the figure.
      canvas.style.touchAction = 'pan-y';
    }
  }

  _ensureState(env) {
    if (this.state) return this.state;
    this.rng = makeRng(this.seed);
    this.state = this.model.init(this.params, this.rng, env);
    this.time = 0;
    this._acc = 0;
    return this.state;
  }

  _onFrame(now) {
    this._raf = requestAnimationFrame(this._onFrame);

    const { w, h } = this.size;
    if (!w || !h) return;
    if (!this.visible) { this._last = now; return; }

    if (!this._last) this._last = now;
    if (!this._fpsAt) this._fpsAt = now;
    let frameDt = (now - this._last) / 1000;
    this._last = now;
    if (frameDt > MAX_FRAME) frameDt = MAX_FRAME;

    const env = this._env();
    const P = this.params;
    const model = this.model;
    const dt = this._dt;

    const state = this._ensureState(env);
    state.width = w;
    state.height = h;
    state.pointer = this.pointer;
    state.time = this.time;

    if (model.sync) model.sync(state, P, this.rng, env);

    if (this.running) {
      this._acc += frameDt * this.speed;
      const budget = Math.max(1, Math.ceil(BASE_CATCHUP * Math.max(1, this.speed)));
      let n = 0;
      while (this._acc >= dt && n < budget) {
        model.step(state, P, dt, this.rng);
        this.time += dt;
        this._acc -= dt;
        n++;
      }
      if (this._acc > dt) this._acc = 0;   // fell behind: drop the backlog
    } else if (this._pending > 0) {
      while (this._pending > 0) {
        model.step(state, P, dt, this.rng);
        this.time += dt;
        this._pending--;
      }
    }
    state.time = this.time;

    this.labels.length = 0;
    state.labels = this.labels;

    // The background is painted untransformed so it always covers the frame;
    // only the drawing is zoomed, and the KaTeX overlay follows it afterwards,
    // since its positions were computed in unzoomed coordinates.
    if (model.clear) model.clear(this.ctx, state, P, env);
    else this.ctx.clearRect(0, 0, w, h);

    const v = this.view;
    const zoomed = v.scale !== 1 || v.x !== 0 || v.y !== 0;
    if (zoomed) {
      this.ctx.save();
      this.ctx.translate(v.x, v.y);
      this.ctx.scale(v.scale, v.scale);
    }
    model.draw(this.ctx, state, P, env);
    if (zoomed) {
      this.ctx.restore();
      for (let i = 0; i < this.labels.length; i++) {
        const l = this.labels[i];
        l.x = l.x * v.scale + v.x;
        l.y = l.y * v.scale + v.y;
      }
    }
    if (this.onLabels) this.onLabels(this.labels, now);

    // Readouts are throttled — they are the only thing that reaches React.
    this._frames++;
    if (now - this._fpsAt > 500) {
      if (this.onFps) this.onFps(Math.round((this._frames * 1000) / (now - this._fpsAt)));
      this._frames = 0;
      this._fpsAt = now;
    }
    if (now - this._statsAt > 200) {
      if (this.onTime) this.onTime(this.time);
      if (this.onStats && model.stats) this.onStats(model.stats(state, P) || []);
      this._statsAt = now;
    }
  }
}

export default Engine;
