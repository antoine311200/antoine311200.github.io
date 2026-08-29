/**
 * figures — interactive figures for articles.
 *
 * A small, self-contained library: it depends on React and KaTeX and nothing
 * else, ships its own stylesheet, and knows nothing about the site it is
 * embedded in. See README.md for the model contract.
 *
 *   import { Figure, boids } from '../lib/figures';
 *   <Figure model={boids} height={440} caption="…" />
 *
 * or, once ./models has been imported once, by registered id:
 *
 *   <Figure model="game-of-life" />
 */

import './figures.css';

export { default as Figure } from './react/Figure';
export { default as useFigure } from './react/useFigure';
export { default as FigureBlock } from './react/FigureBlock';
export { default as LabelLayer } from './react/LabelLayer';
export { default as TexLabel, RichText } from './react/TexLabel';

export { defineModel } from './core/model';
export { definePlot } from './core/definePlot';
export { default as Engine } from './core/engine';
export { createPlot, autoRange, niceTicks } from './core/plot';
export {
  createScene, makeCamera, orbitFromPointer,
  add, sub, scale, dot, cross, len, normalize, rotateAbout, tangent,
} from './core/scene3d';
export { makeRng, nextSeed, between, gaussian, intBetween } from './core/rng';
export { registerModel, registerModels, getModel, listModels, hasModel } from './core/registry';
export { defaultsOf, groupSpecs, formatValue } from './core/params';
export { parseFigureSpec } from './core/spec';

// Importing the library also registers the models that ship with it.
export {
  models, boids, life, pendulum, harmonic, fourier,
  bloch, sphereflock, descent, lorenz, clt,
} from './models';
