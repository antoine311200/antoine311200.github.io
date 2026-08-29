import React, { useState } from 'react';
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
 * The public component.
 *
 *   <Figure model={boids} height={420} caption="…" />
 *   <Figure model="game-of-life" overrides={{ rate: 8 }} controls={false} />
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
  autoplay = true,
  className = '',
  style,
}) {
  const model = getModel(modelProp);
  const [open, setOpen] = useState(true);

  const fig = useFigure(model || EMPTY_MODEL, { overrides, autoplay });

  if (!model) {
    return (
      <figure className={`figx ${className}`} style={style}>
        <div className="figx__frame">
          <div className="figx__stats">Unknown figure model: {String(modelProp)}</div>
        </div>
      </figure>
    );
  }

  const hasControls = controls && model.params.length > 0;
  const stageStyle = aspect ? { aspectRatio: String(aspect) } : { height };

  return (
    <figure className={`figx ${className}`} style={style}>
      <div className="figx__frame">

        {/* toolbar */}
        <div className="figx__bar">
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

          <span className="figx__title">{model.name}</span>

          <span className="figx__spacer" />
          <span className="figx__meta">t = {fig.time.toFixed(1)}s</span>
          <span className="figx__meta" aria-hidden="true">·</span>
          <span className="figx__meta">{fig.fps} fps</span>

          {speeds && <SpeedGroup speed={fig.speed} onChange={fig.setSpeed} />}

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
          {!fig.running && (
            <div className="figx__paused"><span>Paused</span></div>
          )}
        </div>

        {/* readouts */}
        {showStats && <StatBar stats={fig.stats} />}

        {/* controls */}
        {hasControls && open && (
          <div className="figx__panel">
            <PresetBar
              model={model}
              onPreset={fig.applyPreset}
              onAction={fig.runAction}
              onResetParams={fig.resetParams}
              canReset={!fig.isDefault}
            />
            <ParamPanel model={model} params={fig.params} onChange={fig.setParam} />
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
