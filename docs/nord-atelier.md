# Nord Atelier storefront experiment

Nord Atelier is a standalone JavaScript fashion storefront. It explores what
happens when a shopping request or a product click can change the sections on the
page in real time. The prototype uses the Veyndo SDK's direct HTTP client.

## What the browser run showed

- A request for an evening outfit produced a collection with a dress and a tote.
- Selecting the tote opened a product spotlight and streamed a new collection
  with matching pieces. An explicit add action placed the tote in the Veyndo
  demo cart at €169.00.
- A request to compare the wool coat and blazer showed color and catalog price
  in the requested order. Asking for sneakers and jeans in separate sections
  produced two product spotlights.

The local browser run used a real OpenAI response stream and the Nord Atelier
catalog in a running Veyndo instance. Its purchase path ended at the cart.

## How the pieces connect

1. The storefront server reads the catalog with the SDK. It sends the model the
   request, recent actions in that tab and a bounded set of catalog facts.
2. OpenAI streams section proposals. The storefront server checks the section
   types, text, comparison fields and product IDs. The browser renders the
   accepted sections with [OpenUI](https://github.com/thesysdev/openui) and binds
   them to actual catalog data. The storefront's own validation and component
   registry belong to this experiment.
3. Veyndo calculates the cart preview, including price and delivery. The
   current commerce API binds confirmation to the reviewed quote and cart
   revision. The storefront only submits it after an explicit shopper action.
   The model has no cart token or write access.

## Run the SDK excerpt

From the SDK checkout, use Node 22 or later and a local Veyndo instance seeded
with the Nord Atelier catalog. Set `VEYNDO_URL` if your server uses a different
address, or `VEYNDO_SHOP` for a demo shop with the same tote. The example opens
an anonymous test cart, previews one tote and checks that the saved cart is
still empty. It needs no model key.

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { createClient } from './src/index.js';

const client = createClient({
  baseUrl: process.env.VEYNDO_URL ?? 'http://127.0.0.1:8898',
  shop: process.env.VEYNDO_SHOP ?? 'nord-atelier',
});
const locale = { 'x-commerce-locale': 'en-GB' };
const catalog = await client.request('/store-api/product', {
  method: 'POST',
  headers: locale,
  body: { limit: 50 },
});
const tote = catalog.elements.find(product => product.id === 'bag');
assert.ok(tote, 'Seed the Nord Atelier catalog first');

const cartPath = '/store-api/checkout/cart';
const cart = await client.request(cartPath, {
  method: 'POST',
  headers: locale,
  body: {},
});
const headers = { ...locale, 'sw-context-token': cart.token };
const preview = await client.request(`${cartPath}/preview`, {
  method: 'POST',
  headers,
  body: {
    revision: cart.revision,
    items: [{ id: tote.id, quantity: tote.min_purchase ?? 1 }],
  },
});
assert.equal(preview.revision, cart.revision);
assert.ok(preview.review && preview.delivery?.latest);
console.log(tote.name, preview.price.totalMinor, preview.price.currency);

const saved = await client.request(cartPath, { headers });
assert.equal(saved.lineItems.length, 0);
JS
```

After the shopper confirms, send `PUT` to the same cart path with the same
revision and items plus `preview.review` as `review`. If Veyndo returns HTTP
409, fetch the cart and present a fresh preview before asking for confirmation
again. The full prototype also explores streaming layouts and switching shipping
methods. The SDK excerpt uses the cart's current delivery selection.
