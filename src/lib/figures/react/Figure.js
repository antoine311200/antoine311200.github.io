import React, { useCallback, useEffect, useRef, useState } from 'react';
import useFigure from './useFigure';
import { IconButton, ParamPanel, PresetBar, StatBar, SpeedGroup } from './Controls';
import LabelLayer from './LabelLayer';
import { getModel } from '../core/registry';
import '../figures.css';

/* ── icons ─────────────────────────────────────────────────────────────────── */

const Play = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z" />
  </svg>
);
const Pause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);
const Step = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 4.5v15a1 1 0 0 0 1.54.84L17 13.4V19a1 1 0 1 0 2 0V5a1 1 0 1 0-2 0v5.6L7.54 3.66A1 1 0 0 0 6 4.5z" />
  </svg>
);
const Rewind = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);
const Expand = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" />
  </svg>
);
const Collapse = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M3 9h6V3M21 9h-6V3M3 15h6v6M21 15h-6v6" />
  </svg>
);
const ZoomIn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5M8.5 11h5M11 8.5v5" />
  </svg>
);
const ZoomOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5M8.5 11h5" />
  </svg>
);
const Dice = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

/* ── figure ────────────────────────────────────────────────────────────────── */

/**
 * `controls` accepts `true`, `false`, or a list of parameter keys — the last
 * being how an article exposes one knob and freezes the rest:
 *
 *   controls={['coupling']}     or, from a ```figure block,  controls: coupling
 */
function controlKeysOf(controls) {
  if (Array.isArray(controls)) return controls.map(String);
  if (typeof controls === 'string') {
    const keys = controls.split(',').map(s => s.trim()).filter(Boolean);
    // "true"/"false" arrive as strings from some call sites.
    if (keys.length === 1 && (keys[0] === 'true' || keys[0] === 'false')) return null;
    return keys;
  }
  return null;
}

/**
 * The public component.
 *
 *   <Figure model={boids} height={420} caption="…" />
 *   <Figure model="game-of-life" overrides={{ rate: 8 }} controls={false} />
 *   <Figure model="sc-paths" controls={['coupling']} stats={false} />
 *
 * `model` accepts a model object or a registered id.
 */
export default function Figure({
  model: modelProp,
  overrides,
  caption,
  height = 400,
  aspect,
  controls = true,
  stats: showStats = true,
  speeds = true,
  meta = true,
  autoplay = true,
  zoom,
  className = '',
  style,
}) {
  const model = getModel(modelProp);
  const [open, setOpen] = useState(true);
  const [full, setFull] = useState(false);
  const frameRef = useRef(null);

  const fig = useFigure(model || EMPTY_MODEL, { overrides, autoplay, zoom });

  // Fullscreen. The canvas resizes itself through the engine's ResizeObserver
  // and the KaTeX overlay repositions on the next frame, so nothing else has
  // to know this happened.
  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      if (document.exitFullscreen) document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => { /* denied; nothing to do */ });
    }
  }, []);

  // Only when the frame itself has focus, so arrow keys still belong to a
  // slider and space still activates a button.
  const onKeyDown = useCallback((e) => {
    if (e.target !== frameRef.current) return;
    switch (e.key) {
      case ' ':          e.preventDefault(); fig.toggle(); break;
      case 'ArrowRight': e.preventDefault(); fig.stepOnce(); break;
      case 'r': case 'R': fig.reset(); break;
      case 's': case 'S': fig.shuffle(); break;
      case 'f': case 'F': toggleFullscreen(); break;
      case '+': case '=': fig.zoomBy(1.4); break;
      case '-': case '_': fig.zoomBy(1 / 1.4); break;
      case '0': fig.resetView(); break;
      default: break;
    }
  }, [fig, toggleFullscreen]);

  if (!model) {
    return (
      <figure className={`figx ${className}`} style={style}>
        <div className="figx__frame">
          <div className="figx__stats">Unknown figure model: {String(modelProp)}</div>
        </div>
      </figure>
    );
  }

  const keys = controlKeysOf(controls);
  const shownSpecs = keys
    ? model.params.filter(s => keys.indexOf(s.key) !== -1)
    : model.params;
  const hasControls = controls !== false && shownSpecs.length > 0;
  // A figure with nothing to advance — a plot of two fixed densities, say —
  // has no use for transport controls, and the "Paused" badge would be a lie.
  const isStatic = !!model.static;
  const stageStyle = aspect ? { aspectRatio: String(aspect) } : { height };
  const zoomed = fig.view.scale > 1.001;

  return (
    <figure className={`figx ${className}`} style={style}>
      <div
        ref={frameRef}
        className="figx__frame"
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={`${model.name}. Space plays or pauses, right arrow steps, R restarts, S reseeds, F expands${fig.canZoom ? ', plus and minus zoom, 0 resets the view' : ''}.`}
      >

        {/* toolbar */}
        <div className="figx__bar">
          {!isStatic && (
            <>
              <IconButton
                onClick={fig.toggle}
                label={fig.running ? 'Pause' : 'Play'}
                on={fig.running}
              >
                {fig.running ? <Pause /> : <Play />}
              </IconButton>

              <IconButton onClick={fig.stepOnce} label="Step one frame">
                <Step />
              </IconButton>

              <IconButton onClick={fig.reset} label="Restart with the same seed">
                <Rewind />
              </IconButton>

              <IconButton onClick={fig.shuffle} label="New random seed">
                <Dice />
              </IconButton>
            </>
          )}

          {fig.canZoom && (
            <>
              <IconButton
                onClick={() => fig.zoomBy(1 / 1.6)}
                label="Zoom out"
                disabled={!zoomed}
              >
                <ZoomOut />
              </IconButton>
              <IconButton onClick={() => fig.zoomBy(1.6)} label="Zoom in">
                <ZoomIn />
              </IconButton>
            </>
          )}

          <IconButton
            onClick={toggleFullscreen}
            label={full ? 'Leave fullscreen' : 'Fullscreen'}
            on={full}
          >
            {full ? <Collapse /> : <Expand />}
          </IconButton>

          <span className="figx__title">{model.name}</span>

          <span className="figx__spacer" />

          {zoomed && (
            <button
              type="button"
              className="figx__disclose"
              onClick={fig.resetView}
              title="Reset the view"
            >
              {fig.view.scale.toFixed(1)}× · reset
            </button>
          )}

          {meta && !isStatic && (
            <>
              <span className="figx__meta">t = {fig.time.toFixed(1)}s</span>
              <span className="figx__meta" aria-hidden="true">·</span>
              <span className="figx__meta">{fig.fps} fps</span>
            </>
          )}

          {speeds && !isStatic && <SpeedGroup speed={fig.speed} onChange={fig.setSpeed} />}

          {hasControls && (
            <button
              type="button"
              className="figx__disclose"
              aria-expanded={open}
              onClick={() => setOpen(o => !o)}
            >
              {open ? 'Hide' : 'Controls'}
            </button>
          )}
        </div>

        {/* stage */}
        <div className="figx__stage" style={stageStyle}>
          <canvas
            ref={fig.canvasRef}
            className="figx__canvas"
            role="img"
            aria-label={model.description || model.name}
          />
          <LabelLayer labels={fig.labels} registry={fig.labelRegistry} />
          {!fig.running && !isStatic && (
            <div className="figx__paused"><span>Paused</span></div>
          )}
        </div>

        {/* readouts */}
        {showStats && <StatBar stats={fig.stats} />}

        {/* controls */}
        {hasControls && open && (
          <div className="figx__panel">
            {/* A figure cut down to one or two knobs does not want a preset
                row offering to change everything else. */}
            {!keys && (
              <PresetBar
                model={model}
                onPreset={fig.applyPreset}
                onAction={fig.runAction}
                onResetParams={fig.resetParams}
                canReset={!fig.isDefault}
              />
            )}
            <ParamPanel
              model={model}
              specs={shownSpecs}
              flat={!!keys}
              params={fig.params}
              onChange={fig.setParam}
            />
          </div>
        )}
      </div>

      {caption && <figcaption className="figx__caption">{caption}</figcaption>}
    </figure>
  );
}

// Keeps hook order stable when an unknown id is passed.
const EMPTY_MODEL = {
  id: '__empty__',
  name: '',
  params: [],
  presets: [],
  actions: [],
  rate: 60,
  init: () => ({}),
  step: () => {},
  draw: () => {},
};
