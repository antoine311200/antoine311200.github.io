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
