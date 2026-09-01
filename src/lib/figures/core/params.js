/**
 * Parameter specs.
 *
 * A model declares its knobs declaratively; the React layer turns that
 * declaration into controls, and the engine only ever sees a plain
 * `{ key: value }` object. Nothing in the UI is hand-wired per model.
 *
 *   { key, label, type: 'range',  min, max, step, default, unit, tex, format, group, hint, reinit }
 *   { key, label, type: 'toggle', default, tex, group, hint, reinit }
 *   { key, label, type: 'select', options: [{ value, label }], default, group, hint, reinit }
 *
 * `reinit: true` means the simulation cannot absorb the change while running
 * (a grid resize, say), so the engine rebuilds state when it changes.
 */

export const UNGROUPED = 'Parameters';

/** Every spec normalised to have an explicit type and group. */
export function normalizeSpecs(specs = []) {
  return specs.map(s => ({
    type: 'range',
    group: UNGROUPED,
    ...s,
  }));
}

/** The `{ key: value }` object a model starts from. */
export function defaultsOf(specs = [], overrides = {}) {
  const out = {};
  for (const s of specs) out[s.key] = s.default;
  return { ...out, ...overrides };
}

/** Specs in declaration order, bucketed by `group`. */
export function groupSpecs(specs = []) {
  const order = [];
  const byGroup = new Map();
  for (const s of specs) {
    const g = s.group || UNGROUPED;
    if (!byGroup.has(g)) { byGroup.set(g, []); order.push(g); }
    byGroup.get(g).push(s);
  }
  return order.map(name => ({ name, specs: byGroup.get(name) }));
}

/** Decimal places implied by a slider's step, so 0.05 shows as "1.60". */
export function decimalsForStep(step) {
  if (!step || step >= 1) return 0;
  return Math.min(4, Math.max(0, -Math.floor(Math.log10(step))));
}

/** Human-readable value for a control's readout. */
export function formatValue(spec, value) {
  if (typeof spec.format === 'function') return spec.format(value);
  if (spec.type === 'select') {
    const opt = (spec.options || []).find(o => o.value === value);
    return opt ? opt.label : String(value);
  }
  if (typeof value !== 'number') return String(value);
  return value.toFixed(decimalsForStep(spec.step));
}

/** True when any spec marked `reinit` differs between two param sets. */
export function needsReinit(specs = [], prev = {}, next = {}) {
  for (const s of specs) {
    if (s.reinit && prev[s.key] !== next[s.key]) return true;
  }
  return false;
}
