import { registerModels } from '../core/registry';

import boids from './boids';
import life from './life';
import pendulum from './pendulum';
import harmonic from './harmonic';
import fourier from './fourier';

/**
 * Every model that ships with the library, registered by id so figures can be
 * referenced as `<Figure model="boids" />` — which is what a markdown
 * integration needs, since the article source only carries a string.
 */
export const models = registerModels([
  boids,
  life,
  pendulum,
  harmonic,
  fourier,
]);

export { boids, life, pendulum, harmonic, fourier };
export default models;
