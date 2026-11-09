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
3. Veyndo calculates the cart preview, including price and delivery. Only an
   explicit shopper action sends the checked cart change to Veyndo with the
   reviewed totals and revision. The model has no cart token or write access.

## Run the SDK excerpt

From the SDK checkout, use Node 22 or later and a local Veyndo instance seeded
with the Nord Atelier catalog. Set `VEYNDO_URL` if your server uses a different
address. The example opens an anonymous test cart, previews one tote and checks
that the saved cart is still empty. It needs no model key.

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { createClient } from './src/index.js';

const client = createClient({
  baseUrl: process.env.VEYNDO_URL ?? 'http://127.0.0.1:8898',
  shop: 'nord-atelier',
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
    shippingMethodId: 'standard',
  },
});
assert.equal(preview.selectionNeedsConfirmation, false);
assert.ok(preview.deliveries.some(delivery => delivery.deliveryDate?.latest));
console.log(tote.name, preview.price.totalMinor, preview.price.currency);

const saved = await client.request(cartPath, { headers });
assert.equal(saved.lineItems.length, 0);
JS
```

The full prototype adds the streaming agent, the component renderer and the
explicit cart confirmation. The SDK excerpt above covers the commerce calls
before that confirmation.
