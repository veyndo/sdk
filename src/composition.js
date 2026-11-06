/** Compose independently authenticated services and trusted views. Layouts cannot grant calls or choose endpoints. */
import { createLayoutRegistry, jsonCopy } from './workspace.js';
export { createLayoutRegistry } from './workspace.js';
export class CompositionError extends Error {
  constructor(code) { super(code); this.name = 'CompositionError'; this.code = code; }
}
export function createComposition({ services, views, context }) {
  const registry = createLayoutRegistry(views.map(({ id, version, title }) => ({ id, version, title })));
  if (!Array.isArray(services) || services.length > 32) throw new TypeError('At most 32 services');
  const clients = new Map(); const bindings = new Map();
  for (const service of services) {
    if (!/^[a-zA-Z][a-zA-Z0-9_.-]{0,79}$/.test(service.id) || clients.has(service.id) ||
        typeof service.client?.tools !== 'function' || typeof service.client?.tool !== 'function') throw new TypeError('Invalid service');
    clients.set(service.id, service.client);
  }
  for (const view of views) {
    if (!clients.has(view.service) || typeof view.operation !== 'string' || !view.operation ||
        typeof view.arguments !== 'function' || view.effect !== 'read') throw new TypeError('Register explicit read-only view bindings');
    bindings.set(view.id, Object.freeze({ ...view }));
  }
  let current = jsonCopy(context); let epoch = 0; let discovery = 0; let disposed = false;
  function active() { if (disposed) throw new CompositionError('disposed'); }
  let available = new Map(); const pending = new Set();
  function invalidate() {
    epoch++; available = new Map();
    for (const controller of pending) controller.abort();
    pending.clear();
  }
  return Object.freeze({
    setContext(next) {
      active(); const copy = jsonCopy(next);
      for (const field of ['shop', 'tenant', 'actor', 'environment', 'channel'])
        if (JSON.stringify(copy?.[field]) !== JSON.stringify(current?.[field])) throw new CompositionError('new_scope_requires_new_composition');
      invalidate(); current = copy;
    },
    dispose() { disposed = true; invalidate(); },
    async discover({ signal } = {}) {
      active(); invalidate(); const ticket = ++discovery; const start = epoch;
      const states = await Promise.all([...clients].map(async ([id, client]) => {
        try {
          const result = await client.tools({ signal });
          if (!Array.isArray(result?.tools) || result.nextCursor || result.tools.length > 2048) throw new Error('Incomplete discovery');
          const tools = new Map();
          for (const tool of result.tools) {
            if (typeof tool?.name !== 'string' || tools.has(tool.name)) throw new Error('Ambiguous discovery');
            tools.set(tool.name, tool);
          }
          return { id, state: 'ready', tools };
        } catch { return { id, state: 'unavailable', tools: new Map() }; }
      }));
      if (start !== epoch || ticket !== discovery || signal?.aborted) throw new CompositionError('stale_context');
      const next = new Map();
      for (const view of bindings.values()) {
        const tool = states.find(s => s.id === view.service)?.tools.get(view.operation);
        // Untrusted annotations alone never register a callable operation. Both host and current service must agree.
        if (tool?.annotations?.readOnlyHint === true && tool.annotations.destructiveHint === false)
          next.set(view.id, view);
      }
      available = next;
      return { services: states.map(({ id, state }) => ({ id, state })),
        views: registry.catalogue().filter(view => next.has(view.id)) };
    },
    catalogue() { active(); return { version: 1, views: registry.catalogue().filter(view => available.has(view.id)) }; },
    admit(candidate) {
      active(); const layout = registry.admit(candidate);
      return layout && layout.panels.every(panel => available.has(panel.view)) ? layout : null;
    },
    async read(candidate, panelId, { signal } = {}) {
      active(); const layout = registry.admit(candidate);
      if (!layout || !layout.panels.every(panel => available.has(panel.view))) throw new CompositionError('unavailable_view');
      const panel = layout.panels.find(item => item.id === panelId);
      if (!panel) throw new CompositionError('unknown_panel');
      const binding = available.get(panel.view); const start = epoch;
      const controller = new AbortController();
      const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) controller.abort();
      pending.add(controller);
      try {
        const args = jsonCopy(binding.arguments(jsonCopy(panel.input), jsonCopy(current)));
        if (!args || typeof args !== 'object' || Array.isArray(args)) throw new TypeError('Expected object arguments');
        const data = await clients.get(binding.service).tool(binding.operation, args, { signal: controller.signal });
        if (start !== epoch || controller.signal.aborted) throw new CompositionError('stale_context');
        return { panel: panel.id, service: binding.service, operation: binding.operation, data };
      } finally { pending.delete(controller); signal?.removeEventListener('abort', abort); }
    },
  });
}
