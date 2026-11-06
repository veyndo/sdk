/** Shared bounded layout admission. Registered views are host code, never model-supplied code or URLs. */
const id = /^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/;
function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function keys(value, allowed) {
  return object(value) && Object.keys(value).every(key => allowed.includes(key));
}
export function jsonCopy(value, maxBytes = 32768) {
  const encoded = JSON.stringify(value, (key, item) => {
    if (['__proto__', 'constructor', 'prototype'].includes(key) ||
        (item !== null && typeof item === 'object' && !Array.isArray(item) && !object(item)) ||
        ['function', 'undefined', 'symbol', 'bigint'].includes(typeof item) ||
        (typeof item === 'number' && !Number.isFinite(item))) throw new TypeError('Expected plain JSON');
    return item;
  });
  if (!encoded || new TextEncoder().encode(encoded).length > maxBytes) throw new TypeError('JSON exceeds workspace limit');
  return JSON.parse(encoded);
}
export function createLayoutRegistry(views) {
  if (!Array.isArray(views) || !views.length || views.length > 64) throw new TypeError('Register 1–64 trusted views');
  const registered = new Map();
  for (const view of views) {
    if (!keys(view, ['id', 'version', 'title']) || !id.test(view.id) ||
        !Number.isSafeInteger(view.version) || view.version < 1 || registered.has(view.id) ||
        typeof view.title !== 'string' || view.title.length > 200) throw new TypeError('Invalid registered view');
    registered.set(view.id, Object.freeze({ ...view }));
  }
  return Object.freeze({
    catalogue: () => [...registered.values()].map(view => ({ ...view })),
    admit(candidate) {
      if (!keys(candidate, ['version', 'panels']) || candidate.version !== 1 ||
          !Array.isArray(candidate.panels) || !candidate.panels.length || candidate.panels.length > 12) return null;
      const seen = new Set(); const panels = [];
      for (const panel of candidate.panels) {
        if (!keys(panel, ['id', 'view', 'version', 'input']) || !id.test(panel.id) || seen.has(panel.id)) return null;
        const view = registered.get(panel.view);
        if (!view || panel.version !== view.version) return null;
        let input; try { input = jsonCopy(panel.input ?? {}); } catch { return null; }
        if (!object(input)) return null;
        seen.add(panel.id); panels.push({ id: panel.id, view: view.id, version: view.version, input });
      }
      try { return jsonCopy({ version: 1, panels }); } catch { return null; }
    },
  });
}
