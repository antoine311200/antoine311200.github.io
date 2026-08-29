import { normalizeSpecs } from './params';

/**
 * The model contract.
 *
 * A model is plain data + plain functions. It must not import React, touch the
 * DOM beyond the 2D context handed to `draw`, or call Math.random / Date.now —
 * randomness comes from the `rng` argument and time from `dt`, so that runs are
 * reproducible and the engine can control the clock.
 *
 *   defineModel({
 *     id, name, description,
 *     rate,                                   // simulation steps per second (default 60)
 *     params:  [ ...specs ],                  // see core/params.js
 *     presets: [{ name, values }],
 *     actions: [{ id, label, run(state, params, rng, env) }],
 *
 *     init(params, rng, env)         -> state     // required
 *     step(state, params, dt, rng)   -> void      // required, fixed dt
 *     draw(ctx, state, params, env)  -> void      // required
 *
 *     sync(state, params, rng, env)  -> void      // optional, before each frame
 *     clear(ctx, state, params, env) -> void      // optional, default clearRect
 *     stats(state, params)           -> [{ label, value }]   // optional
 *     onPointer(state, pointer, params, rng) -> void         // optional, press & drag
 *   })
 *
 * Before every frame the engine writes `state.width`, `state.height`,
 * `state.time` (simulated seconds) and `state.pointer` onto the state object.
 */

const REQUIRED = ['init', 'step', 'draw'];

export function defineModel(def) {
  if (!def || typeof def !== 'object') {
    throw new Error('defineModel: expected a model definition object');
  }
  for (const fn of REQUIRED) {
    if (typeof def[fn] !== 'function') {
      throw new Error(`defineModel("${def.id || def.name || '?'}"): missing required ${fn}()`);
    }
  }
  return {
    id: def.id || def.name,
    name: def.name || def.id,
    description: def.description || '',
    rate: def.rate || 60,
    presets: def.presets || [],
    actions: def.actions || [],
    ...def,
    params: normalizeSpecs(def.params || []),
  };
}
