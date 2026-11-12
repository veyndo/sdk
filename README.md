# Veyndo Commerce SDK

Use Veyndo Commerce operations from JavaScript and TypeScript, or connect the same
client to an independently hosted component. The client has no runtime dependencies
and does not import a commerce server, database driver or model provider.

The client uses Veyndo's stateless JSON MCP transport and direct JSON HTTP APIs.
The native registry supplies input types and any declared result types.
Flow draft validation returns a typed result with the revision and
`saved: false`. The Store API catalog and the independent Knowledge service
also have typed clients. Operations without declared results return JSON.
[Component plan](https://github.com/veyndo/veyndo/blob/main/docs/commerce-components.md).

## Current status

SDK 0.4.11 adds purchased digital files to the buyer account client. A
storefront can show localized download titles and fetch the file bytes.
The package also includes the Node and browser catalog examples.
[Connected Shop](examples/connected-shop/README.md#generate-the-layout-with-openui)
places a Product Guide and reviewed variant checkout in an OpenUI layout.
The screenshot shows the corresponding interaction in the hosted storefront.

[Component guide](https://www.veyndo.ai/docs/agentic-component-ui.html) · [Hosted status](https://www.veyndo.ai/docs/status.html) · [Versions](https://www.veyndo.ai/docs/components.json)

[Überblick auf Deutsch](https://www.veyndo.ai/docs/platform-overview.html)

[![Native storefront showing an App result next to cart review](https://raw.githubusercontent.com/veyndo/veyndo/1d824485a47d6c23eb46260c651f42c5d5df492f/docs/assets/apps/product-guide-cart-review-20261111.jpg)](https://www.veyndo.ai/docs/agentic-component-ui.html)

## Read the Store API catalog

Use the [0.4.3 package](https://github.com/veyndo/sdk/releases/tag/v0.4.3) in
your own project, or run `node examples/store-catalog.mjs` from this repository.
The example reads the public Lumen shop without a key.

```js
import { createCatalogClient } from '@veyndo/sdk/catalog';

const catalog = createCatalogClient({
  baseUrl: 'https://app.veyndo.ai',
  shop: 'lumen-story-lab-15-o-98aa4751fa',
  locale: 'de-DE',
});
const page = await catalog.list({ limit: 10 });
if (page.elements.length) {
  const detail = await catalog.detail(page.elements[0].id, { limit: 10 });
  console.log(detail.product.name, detail.variants);
}
```

Keep the shop, language, channel, currency and filters consistent when
passing `nextCursor` back as `after`. Variant pages may repeat the parent
and selected SKU. When combining pages, use each product's `id` once.
Prices and delivery estimates are for display. Checkout recalculates the
order before purchase.

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

Run the browser example from this repository with Node 22 or later:

```sh
node examples/browser.mjs
```

Open the printed address and search, load the next page, or select a product.
The local Node host reads the public Lumen catalog through the SDK. You can
set `VEYNDO_URL`, `VEYNDO_SHOP`, `VEYNDO_LOCALE` and `PORT` at startup.
The browser calls the local host and needs no shop credentials. After installing
the release archive, run `node node_modules/@veyndo/sdk/examples/browser.mjs`
from your project. [Browser walkthrough](https://www.veyndo.ai/docs/one-shop-components.html#run-the-browser-example).

Applications using a same-origin HttpOnly customer session can set
`credentials: 'same-origin'` on their SDK client. The default is to omit credentials.

### Use the Checkout relay

Import `createCheckoutClient` from `@veyndo/sdk/checkout`. Set `baseUrl` to
the Core shop origin. Use `checkout.cart` to open a cart and add items. To
replace the basket, preview the proposed items with the current revision.
Show the buyer Core's price and delivery estimate, then apply the same items
with the returned revision and review fingerprint. On HTTP 409, reload
the cart and ask the buyer to review the new quote.
[Cart walkthrough](https://www.veyndo.ai/docs/checkout-component.html#review-a-cart-change-from-the-sdk).

Use `checkout.options` to list the configured countries and methods.
Submit the buyer's choices with `checkout.select` and the current cart
revision. Show the buyer the price and delivery estimate returned by Core
before confirming the purchase.
[Shipping and payment walkthrough](https://www.veyndo.ai/docs/checkout-component.html#choose-shipping-and-payment-from-the-sdk).

Create a session from the current native cart, then call
`confirm` with the exact reviewed amount in minor units, country, payment
method and legal policy version. Pass the buyer's current cart token on
confirmation. A same origin browser can use its existing session cookie.

If confirmation fails with `outcomeUnknown: true`, read the original
receipt with the same session, cart and buyer IDs. The lookup requires
the current buyer identity and does not submit a purchase.
[Checkout walkthrough](https://www.veyndo.ai/docs/checkout-component.html#use-the-checkout-relay-from-the-sdk).

### Read the buyer's order history

Use `profile.get` to load the signed-in buyer and `profile.save` to replace
the editable contact fields. Send the values you want to keep. Use the
address book methods for delivery and billing addresses.
[Profile walkthrough](https://www.veyndo.ai/docs/merchant-operations.html#edit-the-buyer-profile-with-the-sdk).

Use `@veyndo/sdk/account` from a signed-in buyer session. Pass the
customer token on each call, or use `credentials: 'same-origin'` in the
shop browser. `orders.list` returns the buyer's orders and a cursor when
another page is available. `orders.detail` includes customer-visible receipts.
Pass the order ID and receipt ID to `orders.receiptPdf` to download PDF bytes.
The client applies `maxResponseBytes` to the download (1 MiB by default).
[Order history walkthrough](https://www.veyndo.ai/docs/merchant-operations.html#read-order-history-with-the-sdk).

Use `downloads.list` for the buyer's purchased files and `downloads.file`
with the order and asset IDs to retrieve bytes and MIME type. The account
client defaults to a 1 MiB response limit and accepts up to 20 MiB when
configured. [Digital downloads walkthrough](https://www.veyndo.ai/docs/merchant-operations.html#download-purchased-files-with-the-sdk).

Use `addresses.list` to get saved addresses and their default assignments.
`addresses.create`, `addresses.update` and `addresses.remove` use the same buyer
session. Updates and deletions take the address revision from the list.
Pass the selected address ID to Checkout as `shippingAddressId` or
`billingAddressId`. [Address book walkthrough](https://www.veyndo.ai/docs/merchant-operations.html#manage-buyer-addresses-with-the-sdk).

[Read and render a Veyndo MCP App in your own host](docs/mcp-apps.md).
The [Connected Shop example](examples/connected-shop/README.md) runs that
card beside the typed catalog and Checkout clients. It pins SDK 0.4.6
and uses Core's cart preview before confirming a simulated variant purchase.
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
