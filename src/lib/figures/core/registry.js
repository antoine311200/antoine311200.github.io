/**
 * Model registry.
 *
 * Lets a figure be referenced by id (`<Figure model="boids" />`) rather than by
 * import. That is what a markdown integration needs: the source of a page only
 * carries a string, and the renderer resolves it here.
 */

const models = new Map();

export function registerModel(model) {
  if (!model || !model.id) throw new Error('registerModel: model needs an id');
  models.set(model.id, model);
  return model;
}

export function registerModels(list) {
  list.forEach(registerModel);
  return list;
}

/**
 * Register every model a bundler context exposes — the way to keep models
 * *outside* this library, next to whatever they illustrate:
 *
 *   // src/figures/index.js
 *   registerModelContext(require.context('./', true, /^\.\/[^/]+\/.*\.js$/));
 *
 * Each module contributes its default export (or a named `model`), recursing
 * through subfolders as deep as the context was asked to go. Modules that
 * export something else are skipped, so a folder may hold helpers too.
 *
 * The argument only has to look like a webpack context — a callable with a
 * `keys()` method — so this stays free of any bundler import.
 */
export function registerModelContext(context) {
  if (!context || typeof context.keys !== 'function') {
    throw new Error('registerModelContext: expected a require.context');
  }
  const out = [];
  for (const key of context.keys()) {
    const mod = context(key);
    const model = mod && (mod.default || mod.model);
    if (model && model.id && typeof model.draw === 'function') {
      out.push(registerModel(model));
    }
  }
  return out;
}

export function getModel(idOrModel) {
  if (!idOrModel) return null;
  if (typeof idOrModel !== 'string') return idOrModel;
  return models.get(idOrModel) || null;
}

export function listModels() {
  return Array.from(models.values());
}

export function hasModel(id) {
  return models.has(id);
}
