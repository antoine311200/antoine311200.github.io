/**
 * Seeded pseudo-random generation.
 *
 * Figures never call Math.random(). Every source of randomness flows from a
 * seeded generator owned by the engine, so "Reset" reproduces a run exactly:
 * a reader can change one slider, reset, and compare two runs that differ only
 * by that parameter. "Shuffle" is the explicit way to ask for a new seed.
 */

/** xorshift32 — small, fast, good enough for visual simulation. */
export function makeRng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return function rng() {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/** Deterministic successor seed, used by `Engine.shuffle()`. */
export function nextSeed(seed) {
  return (((seed >>> 0) * 1664525 + 1013904223) >>> 0) || 1;
}

/** Uniform in [min, max). */
export function between(rng, min, max) {
  return min + rng() * (max - min);
}

/** Standard normal via Box–Muller. */
export function gaussian(rng) {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Uniform integer in [min, max]. */
export function intBetween(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
