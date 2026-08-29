import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../core/engine';
import { defaultsOf } from '../core/params';
import { positionLabel } from './LabelLayer';

// Label *content* re-renders at this cadence; positions update every frame.
const LABEL_MS = 90;

// Separator for the label signature; must not occur in an id or a TeX string.
const SEP = String.fromCharCode(1);

/**
 * React binding for the engine.
 *
 * The simulation lives in the Engine and never in React state — the only
 * things that re-render are the readouts (fps, time, stats) and the controls.
 * Dragging a slider writes straight through to the running engine, so
 * parameters reshape the simulation live instead of restarting it.
 */
export function useFigure(model, options = {}) {
  const { overrides, autoplay = true, speed: initialSpeed = 1 } = options;
  const overridesKey = JSON.stringify(overrides || {});

  const defaults = useMemo(
    () => defaultsOf(model.params, overrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, overridesKey]
  );

  const prefersReduced = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const [params, setParams] = useState(defaults);
  const [running, setRunning] = useState(autoplay && !prefersReduced);
  const [speed, setSpeedState] = useState(initialSpeed);
  const [fps, setFps] = useState(0);
  const [time, setTime] = useState(0);
  const [stats, setStats] = useState([]);
  const [labels, setLabels] = useState([]);

  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const labelEls = useRef(new Map());
  const labelSig = useRef('');
  const labelAt = useRef(0);

  // Called by the engine every frame. Positions are written straight to the
  // DOM; only a changed *set of strings* is worth a React render.
  const onLabels = useCallback((live, now) => {
    for (let i = 0; i < live.length; i++) {
      const el = labelEls.current.get(live[i].id);
      if (el) positionLabel(el, live[i]);
    }
    if (now - labelAt.current < LABEL_MS) return;
    labelAt.current = now;

    let sig = '';
    for (let i = 0; i < live.length; i++) sig += live[i].id + SEP + live[i].tex + SEP;
    if (sig === labelSig.current) return;
    labelSig.current = sig;
    setLabels(live.map(l => ({ ...l })));
  }, []);

  // One engine per (canvas, model). Params/speed/running are pushed in below.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const engine = new Engine(canvas, model, {
      params: defaults,
      autoplay: autoplay && !prefersReduced,
      speed: initialSpeed,
      onFps: setFps,
      onTime: setTime,
      onStats: setStats,
      onLabels,
    });
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, defaults, prefersReduced]);

  // A model swap or reset leaves stale nodes registered under old ids.
  useEffect(() => {
    labelEls.current.clear();
    labelSig.current = '';
    setLabels([]);
  }, [model]);

  useEffect(() => { engineRef.current && engineRef.current.setParams(params); }, [params]);
  useEffect(() => { engineRef.current && engineRef.current.setRunning(running); }, [running]);
  useEffect(() => { engineRef.current && engineRef.current.setSpeed(speed); }, [speed]);

  const setParam = useCallback((key, value) => {
    setParams(p => (p[key] === value ? p : { ...p, [key]: value }));
  }, []);

  const applyPreset = useCallback((values) => {
    setParams(p => ({ ...p, ...values }));
  }, []);

  const resetParams = useCallback(() => {
    setParams(defaults);
    engineRef.current && engineRef.current.reset();
  }, [defaults]);

  const reset = useCallback(() => {
    engineRef.current && engineRef.current.reset();
    setTime(0);
  }, []);

  const shuffle = useCallback(() => {
    engineRef.current && engineRef.current.shuffle();
    setTime(0);
  }, []);

  const stepOnce = useCallback(() => {
    setRunning(false);
    engineRef.current && engineRef.current.stepOnce();
  }, []);

  const runAction = useCallback((id) => {
    engineRef.current && engineRef.current.runAction(id);
  }, []);

  const isDefault = useMemo(
    () => Object.keys(defaults).every(k => defaults[k] === params[k]),
    [defaults, params]
  );

  return {
    canvasRef,
    params, setParam, applyPreset, resetParams, isDefault,
    running, setRunning, toggle: () => setRunning(r => !r),
    speed, setSpeed: setSpeedState,
    stepOnce, reset, shuffle, runAction,
    fps, time, stats,
    labels,
    // The Map itself, not the ref: LabelLayer registers nodes on it directly.
    // Identity is stable because it is only ever .clear()ed, never reassigned.
    labelRegistry: labelEls.current,
    engineRef,
  };
}

export default useFigure;
