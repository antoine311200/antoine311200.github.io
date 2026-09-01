import { registerModelContext } from '../lib/figures';

/**
 * Figures that belong to articles, not to the library.
 *
 * The library ships a set of general models (boids, Ising, Lorenz…). Anything
 * written for one article lives here instead, in a folder named after the
 * article, so the two never get mixed up:
 *
 *   src/figures/stochastic-coupling/paths.js   →  model id "sc-paths"
 *
 * Every `.js` file inside a subfolder is picked up automatically and its
 * default export registered by id, which is all a ```figure block needs. Add a
 * file, refer to its id from the markdown, done — there is no list to update.
 *
 * Importing this module once (MarkdownRenderer does) performs the
 * registration.
 */
const context = require.context('./', true, /^\.\/[^/]+\/[^/]*\.js$/);

export const articleModels = registerModelContext(context);

export default articleModels;
