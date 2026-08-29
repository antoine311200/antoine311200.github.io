import React from 'react';
import TexLabel from './TexLabel';
import Select from './Select';
import { formatValue, groupSpecs } from '../core/params';

/* ── primitives ────────────────────────────────────────────────────────────── */

export function IconButton({ onClick, label, on, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={on ? 'figx__btn figx__btn--on' : 'figx__btn'}
    >
      {children}
    </button>
  );
}

function ControlHead({ spec, value }) {
  return (
    <span className="figx__control-head">
      <TexLabel className="figx__label" tex={spec.tex} label={spec.label} />
      <span className="figx__value">
        {formatValue(spec, value)}
        {spec.unit ? <span className="figx__unit">{spec.unit}</span> : null}
      </span>
    </span>
  );
}

function Range({ spec, value, onChange }) {
  const pct = ((value - spec.min) / (spec.max - spec.min)) * 100;
  return (
    <label className="figx__control">
      <ControlHead spec={spec} value={value} />
      <input
        type="range"
        className="figx__range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        aria-label={spec.label}
        aria-valuetext={`${formatValue(spec, value)}${spec.unit ? ' ' + spec.unit : ''}`}
        title={spec.hint || spec.label}
        onChange={e => onChange(spec.key, parseFloat(e.target.value))}
        style={{ '--pct': `${pct}%` }}
      />
    </label>
  );
}

function Toggle({ spec, value, onChange }) {
  return (
    <button
      type="button"
      className="figx__toggle"
      aria-pressed={value ? 'true' : 'false'}
      title={spec.hint || spec.label}
      onClick={() => onChange(spec.key, !value)}
    >
      <span className="figx__dot" />
      {spec.label}
    </button>
  );
}

function Choice({ spec, value, onChange }) {
  return (
    <div className="figx__control">
      <span className="figx__control-head">
        <TexLabel className="figx__label" tex={spec.tex} label={spec.label} />
      </span>
      <Select
        value={value}
        options={spec.options || []}
        label={spec.label}
        hint={spec.hint}
        onChange={v => onChange(spec.key, v)}
      />
    </div>
  );
}

function Control(props) {
  if (props.spec.type === 'toggle') return <Toggle {...props} />;
  if (props.spec.type === 'select') return <Choice {...props} />;
  return <Range {...props} />;
}

/* ── composed panels ───────────────────────────────────────────────────────── */

export function PresetBar({ model, onPreset, onAction, onResetParams, canReset }) {
  const presets = model.presets || [];
  const actions = model.actions || [];
  if (!presets.length && !actions.length) return null;

  return (
    <div className="figx__row">
      {presets.length > 0 && <span className="figx__row-label">Presets</span>}
      {presets.map(p => (
        <button key={p.name} type="button" className="figx__chip" onClick={() => onPreset(p.values)}>
          {p.name}
        </button>
      ))}
      {actions.map(a => (
        <button key={a.id} type="button" className="figx__chip" onClick={() => onAction(a.id)}>
          {a.label}
        </button>
      ))}
      <button
        type="button"
        className="figx__chip figx__chip--ghost"
        onClick={onResetParams}
        disabled={!canReset}
        style={canReset ? undefined : { opacity: 0.35, cursor: 'default' }}
      >
        defaults
      </button>
    </div>
  );
}

export function ParamPanel({ model, params, onChange }) {
  // A spec may declare `visible: (params) => bool`, so a model can hide the
  // knobs that do not apply to the currently selected variant.
  const shown = model.params.filter(
    s => (typeof s.visible === 'function' ? s.visible(params) : true)
  );
  const groups = groupSpecs(shown);

  return (
    <>
      {groups.map(group => {
        const ranges = group.specs.filter(s => s.type !== 'toggle');
        const toggles = group.specs.filter(s => s.type === 'toggle');
        return (
          <div className="figx__group" key={group.name}>
            {groups.length > 1 && <p className="figx__group-title">{group.name}</p>}
            {ranges.length > 0 && (
              <div className="figx__grid">
                {ranges.map(spec => (
                  <Control key={spec.key} spec={spec} value={params[spec.key]} onChange={onChange} />
                ))}
              </div>
            )}
            {toggles.length > 0 && (
              <div className="figx__toggles" style={{ marginTop: ranges.length ? 10 : 0 }}>
                {toggles.map(spec => (
                  <Control key={spec.key} spec={spec} value={params[spec.key]} onChange={onChange} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function StatBar({ stats }) {
  if (!stats || !stats.length) return null;
  return (
    <div className="figx__stats">
      {stats.map((s, i) => (
        <span key={`${s.label}-${i}`}>
          {s.color && (
            <span
              className="figx__swatch"
              aria-hidden="true"
              style={{ background: s.color, height: s.dashed ? undefined : 2, ...(s.dashed ? {
                background: `repeating-linear-gradient(to right, ${s.color} 0 4px, transparent 4px 7px)`,
              } : null) }}
            />
          )}
          {s.label}
          {s.value !== undefined && <span className="figx__stat-value">{s.value}</span>}
        </span>
      ))}
    </div>
  );
}

export const SPEEDS = [0.25, 0.5, 1, 2, 4];

export function SpeedGroup({ speed, onChange }) {
  return (
    <span className="figx__speeds" role="group" aria-label="Playback speed">
      {SPEEDS.map(s => (
        <button
          key={s}
          type="button"
          className="figx__speed"
          aria-pressed={speed === s ? 'true' : 'false'}
          aria-label={`${s} times speed`}
          onClick={() => onChange(s)}
        >
          {s}×
        </button>
      ))}
    </span>
  );
}
