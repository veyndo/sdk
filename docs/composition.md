# Service composition and agent workspace contract

`@veyndo/sdk/composition` connects independently authenticated services to a
bounded, versioned layout. A trusted host registers service clients and the views
it actually implements. An agent can select those views and supply input; it cannot
choose a server URL, operation, token, renderer, permission or executable code.

The SDK has no React, database, model or complete Veyndo dependency. Standalone
hosts and Veyndo can use the same `createLayoutRegistry` for layout admission.
A renderer maps admitted view IDs to its reviewed local components.

```js
import { createComposition } from '@veyndo/sdk/composition';
const workspace = createComposition({
  services: [{ id: 'commerce', client: yourScopedCommerceClient }],
  context: { shop: 'demo', environment: 'live', locale: 'de-DE' },
  views: [{ id: 'commerce.products', version: 1, title: 'Products',
    service: 'commerce', operation: 'catalog.search', effect: 'read',
    arguments: input => ({ query: input.query ?? '' }) }],
});
await workspace.discover();
// Only this catalogue, never the service clients or credentials, enters the prompt.
const catalogue = workspace.catalogue();
const proposal = { version: 1, panels: [
  { id: 'products', view: 'commerce.products', version: 1, input: { query: 'chair' } },
] };
if (workspace.admit(proposal)) {
  const result = await workspace.read(proposal, 'products');
  // Render result.data with the registered product view. It is current server data.
}
```

## Current authority and failure behavior

Each client retains its own origin, scoped token and actual server admission.
Discovery intersects trusted local bindings with the currently exposed service
tools. Automatic views require the host's explicit `effect: read` and the actual
tool's `readOnlyHint: true`, `destructiveHint: false`. Unknown, ambiguous, incomplete
or paginated tool lists fail closed. Service annotations alone never register a view.
The server still checks current rights on every invocation. The SDK is not an
identity issuer, permission engine, transaction coordinator or retry scheduler.

A failing service is marked unavailable while independent healthy views remain
available. No calls are retried. Original SDK errors, including uncertain outcomes,
propagate to the host. Financial and other writes belong in their existing review
controls and backend operations, not automatic data loading.

`setContext` aborts reads, empties discovery and discards late results, including
transports that ignore abort. Use it for a changed selected resource or locale,
then discover again. A different shop, tenant, actor, environment or channel
requires a **new composition with the corresponding new clients**. Context is
supplied by trusted host code, never by the model. Dispose on unmount/logout;
disposed compositions cannot resume. Rediscovery also invalidates running reads.

Layouts admit 1–12 panels, at most 64 registered views and 32 services. All view
versions must match. IDs are bounded; inputs and the complete layout have a 32 KiB
JSON limit. Unknown layout/panel fields, duplicate panel IDs, prototype keys and
non-JSON values are rejected. Input mapping remains the view owner's code and
must use its documented API schema. Layout definitions may contain sensitive
filters; this package does not persist them or send them to a model automatically.

## Run and extend

`examples/composition.mjs` connects your actual commerce endpoint and a second
configured component with separate credentials. It requires the second service's
documented read tool and arguments; it does not invent a released Knowledge API.
`test/composition.test.js` starts two independent MCP HTTP fixtures and exercises
credentials, routing, failures, revocation, context races and hostile definitions.
These are protocol/host tests, not acceptance of every underlying business service.

The first native consumer is the existing reviewed Products/Orders/Customers
workspace renderer. Its entity, PII, criteria and intake checks run before shared
layout admission. OpenUI maps only registered local controls; the SDK adds no
arbitrary generated JavaScript or new data writer.

## Render an admitted workspace with A2UI

Install [SDK 0.4.15](https://github.com/veyndo/sdk/releases/tag/v0.4.15).
Register your reviewed component types in the renderer catalog and map the
same types to the versioned workspace views on the host. The catalog must
include a `Column` with a `children` list, or the equivalent component
named by `rootComponent`.

```js
import { createA2uiAdapter } from '@veyndo/sdk/a2ui';

const catalogId = 'my-store:workspace-v1';
const adapter = createA2uiAdapter({
  catalogId,
  views: [{ view: 'commerce.products', version: 1, component: 'Products' }],
});
const result = adapter.project(workspace, proposal, {
  surfaceId: 'products-workspace',
  capabilities: clientMetadata.a2uiRendererCapabilities,
});
if (result.kind === 'a2ui') {
  renderer.processMessages(result.messages);
}
```

The adapter admits the layout against the current composition before looking
up renderer bindings. It returns `rejected` for an inadmissible layout.
Without A2UI 1.0 support, the agreed catalog, or an exact view binding, the host
gets `structured` with panel references for a plain or native presentation.
Neither format includes panel inputs, service data or actions. Use
`workspace.read(proposal, panel.id)` for an explicit host read and bind the
result locally. On a context change, discard the old surface and rediscover
before projecting another layout. Choose a unique surface ID for each mount.

[Connected Shop](../examples/connected-shop/README.md#compare-openui-and-a2ui)
uses this adapter with the official Lit renderer. Its purchase and guide
controls remain owned by the example host. Platform integration and broader
catalog coverage are tracked in the
[Veyndo component plan](https://www.veyndo.ai/docs/commerce-components.html).

[Nord Atelier](nord-atelier.md) is a separate storefront experiment that uses
the SDK's direct HTTP client and validates its streamed UI in the storefront host.
