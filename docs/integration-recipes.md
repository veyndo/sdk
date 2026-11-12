# SDK integration recipes

[Start with the SDK overview](../README.md) for an install command and runnable examples.

## Read the Store API catalog

Use the [0.4.15 package](https://github.com/veyndo/sdk/releases/tag/v0.4.15) in
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

## HTTP and MCP from Node

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
npm install https://github.com/veyndo/sdk/releases/download/v0.4.25/veyndo-sdk-0.4.25.tgz
```

The package includes MCP App resources, the Knowledge client, typed Flow draft
validation, buyer account operations and the A2UI workspace adapter.

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

The [Node example](../examples/knowledge.mjs) can import one JSON source at a
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

On the shop origin, pass the shop ID and set `credentials: 'same-origin'` on
the account and Checkout clients. They read the shop's CSRF proof cookie
for each call. The browser sends the HttpOnly session cookie. Server-side
clients can pass the buyer token explicitly.
[Browser session walkthrough](https://www.veyndo.ai/docs/merchant-operations.html#use-the-signed-in-browser-with-the-sdk).

Use `account.session.register`, `account.session.signIn` and
`account.session.signOut` to manage that session in your shop frontend.
Sign-in takes the open cart token and returns the cart with a new token.
Use the returned token for subsequent checkout calls.

For signed-in buyers, `account.session.changePassword` takes the current and
new password. The current browser receives a new session and previous sessions
expire. [Password change](https://www.veyndo.ai/docs/merchant-operations.html#change-a-buyer-password-with-the-sdk).

### Sign in buyers from your backend

Use `shop.account.token` if you host your own frontend and keep buyer sessions
on your backend. Use the same shop, channel and locale for the cart and account.
The backend needs the buyer's credentials and the current guest cart token.

```ts
import { createHostedShop } from '@veyndo/sdk/hosted';

const { account, checkout } = createHostedShop({
  shop: process.env.VEYNDO_SHOP,
  locale: 'de-DE',
});

// In your backend's sign-in handler, with the credentials and cart from that session:
const { token: cartToken, customerToken } = await account.token.signIn(
  { email, password }, { cartToken: guestCartToken },
);
const buyer = await account.profile.get({ customerToken });
const cart = await checkout.cart.read({ cartToken, customerToken });
```

Replace the guest cart token with the returned cart token as soon as sign-in
succeeds. Store both tokens in your backend session and give your browser only
your own secure, HttpOnly session cookie. Return the account and cart fields
the page needs. Keep tokens and passwords out of browser responses and logs.

- `account.token.register({ name, email, password })` returns a buyer token.
  If there is already a guest cart, call `signIn` to attach it to the buyer.
- `account.token.changePassword({ oldPassword, newPassword }, { customerToken })`
  revokes previous buyer sessions and returns the replacement token.
- `account.token.signOut({ customerToken, cartToken })` revokes the session.
  When you supply the cart token, the shop also detaches the buyer and rotates
  that cart token. Discard both values and open a fresh guest cart as needed.

If an authentication write returns `outcomeUnknown: true`, resolve the session
state before retrying. For example, after a lost sign-in response, start a new
guest cart and sign in again. The previous cart token may already have rotated.
On the shop origin, use the HttpOnly browser flow described above.

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

For a signed-in buyer on a shop using the Checkout relay, pass the current
cart returned by Core to `checkout.prepare`. The SDK prepares the session,
the exact confirmation payload and the lookup for the original receipt.
Render the selected items, total, delivery estimate and terms from the cart.
Store the request key per reviewed cart revision so an interrupted preparation
can repeat with the same key and input.

```ts
const access = { cartToken, customerToken };
const cart = await checkout.cart.read(access);
const draft = await checkout.prepare(cart, { requestKey, customerToken });

// In the buyer's confirmation handler, after showing the reviewed quote:
const order = await checkout.confirm({ ...draft.confirmation, confirmed: true }, access);
console.log(order.orderNumber);
```

On HTTP 409, reload the cart and show the changed quote. If confirmation fails
with `outcomeUnknown: true`, use
`checkout.receipt(draft.receiptLookup, { customerToken })` with the original
IDs. An HTTP 404 during this lookup can mean the receipt is still pending.
Keep those IDs and check again without submitting another purchase. A
same-origin shop frontend can use the existing browser session instead of
passing a customer token.
[Connected Shop example](../examples/connected-shop/README.md) ·
[Checkout component](https://www.veyndo.ai/docs/checkout-component.html#use-the-checkout-relay-from-the-sdk).

### Build the checkout address form

Call `checkout.addressOptions(access)` to load the countries and regions for
the current sales channel. It also returns the shipping and payment
candidates from `checkout.options`. Pass the current cart and buyer context
to keep those candidates in the cart's currency and buyer group.

```ts
const { countries, shipping, payments } = await checkout.addressOptions(access);
// Render the country and region pickers with label as text and code as value.
const country = countries.find(option => option.code === selectedCountry);
const region = country?.regions.find(option => option.code === selectedRegion);
const address = { ...buyerAddress, country: country?.code, countryStateId: region?.code };
```

Require a region selection when `requiresRegion` is true and clear the selected
region when the country changes. Pass the selected country and address to
`checkout.select` with the current cart revision. The SDK provides the
choices. Veyndo validates the address and selected methods and returns a
new quote.

### Show the terms and record the buyer's decision

Load `checkout.legalPolicy()` for the checkout's sales channel and show its
public documents in the buyer's language. Use the same SDK scope for the
policy and cart. The cart's `legal` flags say when Core requires acknowledgement
and whether this purchase includes immediate digital delivery.

```ts
const policy = await checkout.legalPolicy();
// Render policy.data.documents. Read both choices from the buyer's controls.
if (buyerAcceptedTerms) {
  await checkout.acceptTerms({
    policyVersion: policy.policyVersion,
    terms: true,
    digitalImmediate: buyerRequestedImmediateDelivery,
  }, access);
}
```

Record this step after the buyer actively accepts the displayed terms and
before confirming the purchase. Keep the digital delivery choice separate.
If either the acceptance or confirmation returns HTTP 409, reload the policy
and the cart, then show the current documents and quote for review. Preserve
the policy version the buyer saw until they have reviewed the new version.

### Apply coupon codes and switch currency

Use `checkout.cart` to change how an existing cart is priced. Each change
returns the full cart with a new revision. Use the returned total, discounts
and payment options when you show the updated quote.

```ts
let cart = await checkout.cart.read(access);
cart = await checkout.cart.setCoupons({ codes: [enteredCode], revision: cart.revision }, access);

if (cart.availableCurrencies?.includes(selectedCurrency)) {
  cart = await checkout.cart.setCurrency({ currency: selectedCurrency, revision: cart.revision }, access);
}

console.log(cart.price.totalMinor, cart.price.currency, cart.discounts);
```

The codes array replaces the current list. Pass `[]` to clear it. A submitted
code appears in `couponCodes`. Show a discount as applied only when the quote
includes it in `discounts`. On HTTP 409, reload the cart and use its new
revision. If the buyer was reviewing checkout, show the new quote and prepare
checkout again from the latest revision before asking for confirmation.

### Check the payment after buyer approval

When confirmation or receipt recovery returns a `paymentAttemptId`, keep
that ID and the original cart token in the buyer's session across the
provider return. Carry the customer token as well if your backend uses one.
A payment attempt belongs to the original cart even after an order exists.

```ts
const attemptId = receipt.paymentAttemptId;
if (attemptId) {
  const status = await checkout.payment.status(attemptId, access);
  if (status.state === 'ready' && status.checkout !== 'embedded' && status.approvalUrl) {
    // Offer this provider link for the buyer to open.
    showApprovalLink(status.approvalUrl);
  }
}
```

On the provider's approval return, queue a check using the attempt ID and
access from your session. Core verifies approval with the provider and may
capture the approved payment. Use the same request key if the response is
lost, so that a retry returns the original job. A cancellation return can
read the current status directly.

```ts
await checkout.payment.reconcile(attemptId, { requestKey: `${attemptId}:provider-return` }, access);
const payment = await checkout.payment.status(attemptId, access);
showPaymentStatus(payment);
```

The job acknowledgement only means the check was queued. While the provider
check is in progress, show a pending state and refresh status separately.
Render captured and refunded amounts using `currencyScale`. If you use
Veyndo's hosted approval flow, the provider returns to the shop's configured
return route. An embedded payment method uses its own provider UI.

### Place an invoice order and show payment instructions

Use `@veyndo/sdk/checkout` or the checkout client from
`@veyndo/sdk/hosted`. Start with the buyer's cart and select the eligible
invoice method and delivery option using `checkout.select()`. Include the
buyer's contact and billing details. Show the terms and record their
decision, then present the current cart total for explicit purchase approval.

```ts
const reviewedCart = await checkout.cart.read(access);
// Present this cart and wait for the buyer to approve the purchase.
// Create and retain a request key for this specific approved review.
const order = await checkout.place(reviewedCart, { requestKey, confirmed: true }, access);
const attemptId = order.payment.attemptId;
```

`place` sends the exact amount and currency from the reviewed cart, together
with its revision. On a changed cart or quote, reload and ask for a fresh
approval. If the response is lost, repeat with the original review, cart
token and request key. The server can return the original order. You can
also read the completed cart's `order` snapshot with `checkout.cart.read(access)`.

#### Show invoice payment instructions

Keep the original cart access for payment reads after purchase. If the order
has a payment attempt, check `checkout.payment.status()`. Its
`instructionsAvailable` flag indicates that the method supports instructions.

```ts
if (attemptId) {
  const payment = await checkout.payment.status(attemptId, access);
  if (payment.instructionsAvailable) {
    const invoice = await checkout.payment.instructions(attemptId, access);
    if (invoice.status === 'available') {
      showBankTransfer({
        ...invoice.instructions,
        amountMinor: invoice.amountMinor,
        currency: invoice.currency,
        currencyScale: invoice.currencyScale,
        simulated: invoice.simulated,
      });
    } else if (invoice.status === 'pending') {
      showBankDetailsPending();
    }
  }
}
```

While details are pending, show a pending message and let the buyer refresh.
If the method returns `unsupported`, omit the bank transfer section.
Label simulated details as test data. Keep payment status separate.
Receiving bank details leaves the order awaiting settlement until Core
records the provider's confirmation.

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

[Read and render a Veyndo MCP App in your own host](mcp-apps.md).
The [Connected Shop example](../examples/connected-shop/README.md) runs that
card beside the typed catalog and Checkout clients. It uses the SDK source in this repository
and Core's cart preview before confirming a simulated variant purchase.
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

The SDK retains the existing [Veyndo Sustainable Use License](../LICENSE). Moving code
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
workspace renderer. [Contract, example and acceptance](composition.md).
