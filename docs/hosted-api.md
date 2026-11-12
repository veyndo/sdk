# Connect a backend to a hosted Veyndo shop

Use Node 22+ with the SDK package and an existing Veyndo shop. The public
Lumen demo is enough for the first catalog read.

```sh
npm install https://github.com/veyndo/sdk/releases/download/v0.4.21/veyndo-sdk-0.4.21.tgz
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

## Build your storefront navigation

Use `catalog.context()` for the resolved language, enabled languages and
currencies. Use `catalog.navigation()` for localized categories in your
sales channel. These reads use the same shop scope as the product catalog.

```js
const { catalog } = createHostedShop({ shop: 'your-shop', locale: 'de-DE' });
const [context, { elements }] = await Promise.all([catalog.context(), catalog.navigation()]);

// After the shopper picks a category of type 'page', pass its ID to the listing.
const products = await catalog.list({ categoryId: selectedCategoryId, limit: 20 });
```

Build the menu from `id` and `parentId` in the returned order. A channel's
navigation root can reference a parent outside the response. Use folders and
structuring entries as groups. For link entries, use the returned URL if
present. Names, descriptions, slugs and URLs can be null. Use `nextCursor`
with the same category, shop, channel, language and currency for the next page.

## Use a shop and its own key

Create or open the shop in [Veyndo Start](https://start.veyndo.ai/). In Studio,
go to **Developer → API & integrations** and create a key with the permissions
your backend needs. For example, use catalog read for merchant product tools.
Set the key in your backend's environment. The catalog, checkout and account
clients share the shop scope. The merchant key is used only by `mcp` and
`mcp.request()`. Use `shop.account.token` on your backend to register buyers
and sign them in. Pass their current buyer token to account and checkout
methods that require it. These buyer calls use the Store API.

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
[Cart coupons and currency](integration-recipes.md#apply-coupon-codes-and-switch-currency) ·
[Buyer sign-in from your backend](integration-recipes.md#sign-in-buyers-from-your-backend) ·
[Run an API-only Core](https://www.veyndo.ai/docs/hosted-component-api.html) ·
[Compose separately hosted components](composition.md).
