# Veyndo Commerce SDK

Use Veyndo Commerce operations from JavaScript and TypeScript, or connect the same
client to an independently hosted component. The client has no runtime dependencies
and does not import a commerce server, database driver or model provider.

The client uses Veyndo's stateless JSON MCP transport and direct JSON HTTP APIs.
The native registry supplies input types and any declared result types.
Flow draft validation returns a typed result with the revision and
`saved: false`. Other results remain available as JSON until their owners
declare a schema. [Component plan](https://github.com/veyndo/veyndo/blob/main/docs/commerce-components.md).

## Try it from Node

Clone this repository, use Node 22 or later, and run the example against your shop:

```sh
git clone https://github.com/veyndo/sdk.git
cd sdk
VEYNDO_URL=https://your-shop.example VEYNDO_SHOP=your-shop node examples/catalog.mjs chair
```

For authenticated operations, provide a scoped integration or agent token through
your private process environment as `VEYNDO_TOKEN`. No token is needed for operations
your server deliberately exposes to public shoppers. The server always decides the
current actor's permissions; the shop option only selects a namespace.

Install a pinned GitHub prerelease in your application:

```sh
npm install github:veyndo/sdk#v0.4.1
```

The GitHub prerelease includes MCP App resources, the Knowledge client and
typed Flow draft validation. The package is distributed from GitHub.

```js
import { createClient, VeyndoError } from '@veyndo/sdk';

const client = createClient({
  baseUrl: 'https://your-shop.example',
  shop: 'your-shop',
  token: () => process.env.VEYNDO_TOKEN,
});
await client.initialize();
const products = await client.tool('catalog.search', { query: 'chair' });
const tools = await client.tools();
const data = await client.request('/your/documented/api/path');
```

An independent service can expose its own endpoint, input contracts and result types.

```ts
const component = createClient<{
  'external.search': { term: string };
}, {
  'external.search': { count: number };
}>({ baseUrl: 'https://component.example', mcpPath: '/knowledge/mcp' });
const { count } = await component.tool('external.search', { term: 'chair' });
```

## Use standalone Knowledge

Connect your own catalog or documents to an independently hosted
[Knowledge service](https://www.veyndo.ai/docs/knowledge-component.html). The typed HTTP client
uses the service's own v1 API and works without Veyndo Core.

```js
import { createKnowledgeClient } from '@veyndo/sdk/knowledge';

const knowledge = createKnowledgeClient({
  baseUrl: process.env.KNOWLEDGE_URL,
  expectedTenant: process.env.KNOWLEDGE_TENANT,
  token: () => process.env.KNOWLEDGE_ACCESS_TOKEN,
});

const evidence = await knowledge.products.search({
  query: 'linen shade', locale: 'en-GB', mainLocale: 'de-DE',
});
if (evidence.sources.length && (await knowledge.products.current(evidence)).current) {
  console.log(evidence.sources.map(({ productId, text }) => ({ productId, text })));
}
```

Use a backend and separate scoped tokens for reading and writing. Knowledge
rejects a valid token for a different tenant. Both `products` and `documents`
support reading, listing, saving, withdrawing, searching, checking evidence
and reading graph relationships. TypeScript distinguishes the two kinds of
evidence and the cursor on a list response.

The [Node example](examples/knowledge.mjs) can import one JSON source at a
time. A new source contains `id`, `revision: 0`, `locale`, `title` and
`content`. Updates and withdrawal require the latest stored revision. Set
the three environment variables from the example above, then run:

```sh
node examples/knowledge.mjs products put product.json
node examples/knowledge.mjs documents put returns-policy.json
node examples/knowledge.mjs documents search "return policy" en-GB de-DE
node examples/knowledge.mjs products list 25
```

Use write scope for the first two commands and the matching read scope for
the last two. The example rechecks evidence before returning passages. Keep
the service's MCP endpoint for tool discovery and agent hosts.

## Check a Flow draft

Use an integration key with `automation.manage` and the rights for the actions
in your draft. Set `VEYNDO_URL`, `VEYNDO_SHOP` and `VEYNDO_TOKEN` in the server
environment. Then check your Flow JSON against that shop.

```sh
node examples/check-flow-draft.mjs draft.json confirm_purchase 0
```

Use revision 0 for a new Flow or pass the current revision of an existing one.
Core checks the same definition and permissions as Studio and returns
`{valid: true, saved: false, revision: 0}` for a valid new Flow. The example
calls the dedicated `automation.validate_flow` tool. An older server without
this tool returns an error.
[Flow draft check and permissions](https://www.veyndo.ai/docs/automation-component.html#check-a-flow-draft-before-saving).

## Browser and app integration

`examples/browser.html` demonstrates public catalog search on the configured shop
origin. The shop must permit that origin; the SDK does not bypass CORS or the MCP
origin check. Same-origin HttpOnly customer sessions can use
`credentials: 'same-origin'`; credentials are omitted by default.

[Read and render a Veyndo MCP App in your own host](docs/mcp-apps.md).
The [Connected shop example](examples/connected-shop/README.md) combines that card with catalog reads and an independent Checkout purchase.
The example negotiates the extension, discovers the installed view and reads
its HTML resource and full tool result.

For sandboxed installed app iframes, use `@veyndo/sdk/guest` and its existing
`connectCommerce()` host bridge. This is the original app guest adapter, exported
with source provenance. Do not replace it with merchant tokens or direct privileged
API calls in browser code.

## Errors and repeated writes

`VeyndoError.kind` distinguishes HTTP, JSON-RPC, tool/domain, protocol, connection,
timeout and cancellation failures. HTTP status and JSON-RPC error code are retained.
Responses are bounded; redirects are rejected before credentials can follow them.
The client never automatically retries a request.

If `outcomeUnknown` is true, a dispatched write may already have completed. Inspect
the original operation and its idempotency key before repeating it. A missing
response, timeout, malformed response or HTTP 5xx is not proof that a write failed.
Tool/domain failures and internal JSON-RPC failures also retain an unknown outcome;
the client cannot infer rollback from an extension's error text.
The flag is conservative for POST calls, including read-only MCP tools.

## Contracts, provenance and tests

`contracts/operations.json`, OpenAPI, WIT and `src/generated/*.d.ts` come from the
compiled native registry's checked exports. `PROVENANCE.json` records the exact
source commit and source/output hashes. Declarations only adapt file extensions
and ESM import specifiers. There is no second handwritten operation catalog.

```sh
npm ci
npm run check
npm test
npm run test:types
python3 scripts/sync-native-contracts.py --source ../veyndo --check
```

Wire tests start independent local HTTP fixtures and cover HTTP/MCP, tenant headers,
protocol negotiation, structured domain errors, redirects, correlation, bounded
responses, cancellation and lost write replies. Negative TypeScript controls check
native and external argument types. These tests do not replace server-side tenant,
storage, payment or complete-product acceptance. CI runs Node 22 and 24.

The SDK retains the existing [Veyndo Sustainable Use License](LICENSE). Moving code
to a separate repository does not change its licensing terms.

## Kurz auf Deutsch

Das SDK verbindet eigene Anwendungen mit Veyndo oder einem separat betriebenen
Baustein. JavaScript und TypeScript verwenden dieselben Operationen wie die
vorhandene MCP Schnittstelle. Der Server prüft Rechte und Shopzugehörigkeit.
Beispiele stehen unter `examples/`; Fortschritt und Gesamtabnahme stehen in der
zentralen Komponentenliste. Die übrigen Komponenten sind noch nicht vollständig
herausgelöst.

## Independent host exchange

`@veyndo/sdk/host` exposes the versioned callback contract for server components:
private record actions, channel/product projections, reviewed paid-order intake
and durable job enqueue/claim/progress. Input DTOs and allowed operation names
are generated from the same contract consumed by Veyndo. `HOST-PROVENANCE.json`
records its exact source. Responses remain host-owned JSON.

```js
import { createHostClient } from '@veyndo/sdk/host';
const host = createHostClient({
  baseUrl: 'https://commerce.example', appId: 'marketplaces',
  shop: 'your-shop', token: process.env.HOST_CALLBACK_TOKEN,
  hostPath: '/commerce/v1/', // Omit for the existing Veyndo callback path.
});
await host.call('job_enqueue', {
  action: 'sync', input: { connectionId: 'ebay-de', kind: 'orders' },
  requestKey: 'explicit-stable-request-key',
});
```

The host must authenticate current tenant/actor, installed package, callback
capabilities and compound action rights. It owns atomic orders/stock, job leases,
CAS and idempotency. The client performs no automatic retries; a lost write
response remains uncertain. This interface runs only on trusted servers, with
callback tokens held privately. The host adapter does not create another queue.

## Compose service workspaces

`@veyndo/sdk/composition` connects separately authenticated services, discovers
currently available read operations and admits agent-proposed layouts against
trusted registered views. Context changes cancel running reads and discard late
results. The same framework-independent layout registry is used by the native
workspace renderer. [Contract, example and acceptance](docs/composition.md).

## Experiment: Nord Atelier

See how a standalone fashion storefront uses the SDK for catalog and cart
operations while OpenAI and OpenUI compose the shopping view in real time.
[Architecture, observed behavior and runnable SDK excerpt](docs/nord-atelier.md).
