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
 */

const MAX_FRAME = 0.25;   // clamp after a tab switch instead of spiralling
const BASE_CATCHUP = 5;   // steps per rendered frame at 1x speed

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

    this.onFps = options.onFps || null;
    this.onStats = options.onStats || null;
    this.onTime = options.onTime || null;

    this._dt = 1 / (model.rate || 60);
    this._raf = 0;
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

  // ── internals ─────────────────────────────────────────────────────────────

  _env() { return { width: this.size.w, height: this.size.h, theme: this.theme }; }

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

    this._resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      // Draw in CSS pixels; the backing store carries the extra resolution.
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.size = { w, h };
    };
    this._resize();
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
    const dispatch = () => {
      if (this.model.onPointer && this.state) {
        this.model.onPointer(this.state, this.pointer, this.params, this.rng);
      }
    };

    this._pointerMove = (e) => {
      const p = at(e);
      this.pointer = { ...this.pointer, x: p.x, y: p.y, active: true };
      if (this.pointer.down) dispatch();
    };
    this._pointerDown = (e) => {
      const p = at(e);
      this.pointer = { x: p.x, y: p.y, active: true, down: true };
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      }
      dispatch();
    };
    this._pointerUp = () => { this.pointer = { ...this.pointer, down: false }; };
    this._pointerLeave = () => { this.pointer = { ...this.pointer, active: false, down: false }; };

    canvas.addEventListener('pointermove', this._pointerMove, { passive: true });
    canvas.addEventListener('pointerdown', this._pointerDown, { passive: true });
    canvas.addEventListener('pointerup', this._pointerUp, { passive: true });
    canvas.addEventListener('pointercancel', this._pointerUp, { passive: true });
    canvas.addEventListener('pointerleave', this._pointerLeave, { passive: true });
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

    if (model.clear) model.clear(this.ctx, state, P, env);
    else this.ctx.clearRect(0, 0, w, h);
    model.draw(this.ctx, state, P, env);

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
