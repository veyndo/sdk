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

The common protocol adapters, cross-service generated UI renderer and remaining
service extractions stay tracked in Veyndo's component plan. This package supplies
the working shared connection and layout boundary they can use.
