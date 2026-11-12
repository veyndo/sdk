/** Project admitted workspace layouts onto a trusted A2UI 1.0 renderer catalog. */
const name = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;
const identifier = /^[A-Za-z][A-Za-z0-9_]{0,79}$/;
const validName = value => typeof value === 'string' && name.test(value);
const validIdentifier = value => typeof value === 'string' && identifier.test(value);

export function createA2uiAdapter({ catalogId, rootComponent = 'Column', views }) {
  if (typeof catalogId !== 'string' || !catalogId.trim() || catalogId.length > 256 ||
      !validIdentifier(rootComponent) || rootComponent === 'Surface' || !Array.isArray(views) || !views.length || views.length > 64)
    throw new TypeError('Register a catalog and 1–64 A2UI view bindings');

  const bindings = new Map();
  for (const { view, version, component } of views) {
    if (!validName(view) || !Number.isSafeInteger(version) || version < 1 ||
        !validIdentifier(component) || component === 'Surface' || component === rootComponent || bindings.has(view))
      throw new TypeError('Invalid A2UI view binding');
    bindings.set(view, { version, component });
  }

  return Object.freeze({
    project(workspace, candidate, { surfaceId, capabilities } = {}) {
      if (!validName(surfaceId)) throw new TypeError('Supply a unique A2UI surface ID');
      const admitted = workspace.admit(candidate);
      if (!admitted) return { kind: 'rejected' };

      const panels = admitted.panels.map(({ id, view, version }) => ({ id, view, version }));
      const supported = capabilities?.['1.0']?.supportedCatalogIds;
      if (!Array.isArray(supported) || !supported.includes(catalogId))
        return { kind: 'structured', reason: 'unsupported_catalog', panels };

      const components = [];
      for (const panel of panels) {
        const binding = bindings.get(panel.view);
        if (binding?.version !== panel.version)
          return { kind: 'structured', reason: 'unsupported_view', panels };
        // Escape underscores too, so punctuation and literal escape sequences stay distinct.
        const wireId = 'panel_' + panel.id.replace(/[^A-Za-z0-9]/g, char => '_' + char.charCodeAt(0).toString(16));
        components.push({ id: wireId, component: binding.component });
      }
      return { kind: 'a2ui', panels, messages: [
        { version: '1.0', createSurface: { surfaceId, catalogId } },
        { version: '1.0', updateComponents: { surfaceId, components: [
          { id: 'root', component: rootComponent, children: components.map(({ id }) => id) },
          ...components,
        ] } },
      ] };
    },
  });
}
