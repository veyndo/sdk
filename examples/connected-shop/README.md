# Connected shop

Open a product from Veyndo in an external web app. Ask for its guide, filter
the installed MCP App in the conversation, then review and confirm a simulated
purchase through independent Checkout. The example uses a fixed guide question
so it runs without a model API key.

## Run it

Use an isolated loopback Veyndo demo shop with independent Checkout enabled
through Core's same origin Store API. Follow the [private Checkout setup](https://www.veyndo.ai/docs/checkout-component.html#route-a-test-shop-through-private-checkout).
Enable the demo card and EUR for the default sales channel. Use a product with
stock, such as `mug` from the furniture fixture.

In that shop, install the [Product Guide package](https://github.com/veyndo/veyndo/blob/main/extensions/apps/assistant-examples/mcp-app.json)
and add public guide entries for the product. Add one `standard` and one
`priority` entry to see the filter change the result. The package also has a
separate merchant view whose records stay private.

From the SDK repository:

```sh
cd examples/connected-shop
npm ci
VEYNDO_URL=http://127.0.0.1:8787 VEYNDO_SHOP=atelier VEYNDO_PRODUCT=mug npm start
```

Open the printed loopback address. The server expects Core at the given
loopback origin. `PORT` selects a different example port if 8812 is in use.
The browser session uses a synthetic buyer account and a test cart. Opening a
new browser session lets you place another demo order. Reloading the same
session shows the original receipt.

## Follow the calls

| File | Role |
| --- | --- |
| `guide.mjs` | Discover the public MCP App resource and its filter from Veyndo. All reads retain the original product and resource. |
| `browser.mjs` | Mount the app HTML in an isolated iframe using the official AppBridge. Only the declared tool can read the chosen product. |
| `commerce.mjs` | Read the product, prepare the cart and create a Checkout session. Confirm the reviewed total only after the shopper clicks. |
| `server.mjs` | Hold buyer and cart credentials, limit requests to this browser origin, and serve the guide with network access disabled. |

The SDK is pinned to the [0.4.0 release archive](https://github.com/veyndo/sdk/releases/tag/v0.4.0).
The same package makes all Commerce and MCP requests. Checkout calls Core for
the authoritative order and stock transaction. If the confirmation response
is lost, the example looks up the original receipt. It never creates another
order to recover the first one. Veyndo persists the order and the receipt.
The example host keeps its short-lived browser sessions in memory.

The host deliberately supports one fixed product and the demo card. For a
full assistant that selects an installed card during an answer, see the
[Veyndo conversation contract](https://www.veyndo.ai/docs/agentic-component-ui.html#show-the-shoppers-app-view-during-the-answer).
