# Connect a backend to a hosted Veyndo shop

Use Node 22+ with the SDK package and an existing Veyndo shop. The public
Lumen demo is enough for the first catalog read.

```sh
npm install https://github.com/veyndo/sdk/releases/download/v0.4.16/veyndo-sdk-0.4.16.tgz
node node_modules/@veyndo/sdk/examples/hosted-shop.mjs
```

```js
import { createHostedShop } from '@veyndo/sdk/hosted';

const veyndo = createHostedShop({
  shop: 'lumen-story-lab-15-o-98aa4751fa',
  locale: 'en-GB',
});

const page = await veyndo.catalog.list({ limit: 3 });
const options = await veyndo.checkout.options();
console.log(page.elements.map(p => p.name), options.shipping.map(s => s.name));
```

The default origin is `https://api.veyndo.ai`. Use `baseUrl` to connect an
API-only Core deployment of your own. `describe()` reads the API profile
without credentials. You can start calling the clients immediately if you
already know the origin.

## Use a shop and its own key

Create or open the shop in [Veyndo Start](https://start.veyndo.ai/). In Studio,
go to **Developer → API & integrations** and create a key with the permissions
your backend needs. For example, use catalog read for merchant product tools.
Set the key in your backend's environment. The catalog, checkout and account
clients share the shop scope. The merchant key is used only by `mcp` and
`mcp.request()`. Checkout and account methods accept a current buyer token
where required.

```js
const shop = createHostedShop({
  shop: process.env.VEYNDO_SHOP,
  channel: process.env.VEYNDO_CHANNEL,
  locale: 'de-DE',
  merchantToken: () => process.env.VEYNDO_TOKEN,
});

await shop.mcp.initialize();
const { tools } = await shop.mcp.tools();
console.log(tools.map(tool => tool.name));
```

Keep these clients and merchant keys in the server or a same-origin backend for
your frontend. For hosted HTTP errors, `VeyndoError.requestId` exposes the
response's request ID when the server provides one. Check the shop, channel and
key scope for a 401, 403 or 404. For an uncertain checkout write, recover the
original result using the existing receipt flow.

[Checkout and receipt recipe](integration-recipes.md#use-the-checkout-relay) ·
[Buyer accounts](integration-recipes.md#read-the-buyers-order-history) ·
[Run an API-only Core](https://www.veyndo.ai/docs/hosted-component-api.html) ·
[Compose separately hosted components](composition.md).
