import { registerModels } from '../core/registry';

import boids from './boids';
import life from './life';
import pendulum from './pendulum';
import harmonic from './harmonic';
import fourier from './fourier';
import bloch from './bloch';
import sphereflock from './sphereflock';
import descent from './descent';
import lorenz from './lorenz';
import clt from './clt';
import phase from './phase';
import spectrum from './spectrum';
import ising from './ising';

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
  bloch,
  sphereflock,
  descent,
  lorenz,
  clt,
  phase,
  spectrum,
  ising,
]);

export {
  boids, life, pendulum, harmonic, fourier,
  bloch, sphereflock, descent, lorenz, clt,
  phase, spectrum, ising,
};
export default models;
