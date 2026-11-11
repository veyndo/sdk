# Connected shop

Open a product from Veyndo in an external web app. Ask for its guide, filter
the installed MCP App in the conversation, choose a variant, then review and
confirm a simulated purchase through independent Checkout. The example uses a fixed guide question
so it runs without a model API key.

## Run it

Use an isolated loopback Veyndo demo shop with independent Checkout enabled
through Core's same origin Store API. Follow the [private Checkout setup](https://www.veyndo.ai/docs/checkout-component.html#route-a-test-shop-through-private-checkout).
Enable the demo card and EUR for the default sales channel. Use a product with
stock, such as `mug` from the furniture fixture. To try the variant picker,
use a parent product with two active variants at different prices. The example
loads one family with at most 50 catalogue entries.

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

### Generate the layout with OpenUI

The Node host assembles the Purchase and Product Guide panels as OpenUI.
Append `#guide` to the example URL to ask for the guide first. With an
`OPENAI_API_KEY` in the Node environment, OpenAI chooses the order of those
two panels. Set `OPENAI_MODEL` to select a different model. The model receives
only the requested focus. The local layout is available without a key and
also serves as the fallback for invalid or unavailable model responses.

OpenUI places the host's existing controls. It receives no price, variant ID,
cart token or confirmation capability from the model. The MCP App continues
to read the configured product and the host requests the current cart quote
from Core before the shopper can confirm.

Choose one variant and select **Review purchase** to see Core's total,
shipping cost and delivery estimate. Change the selection to clear the offer.
Review again, then select **Confirm simulated purchase**. The receipt names
the variant you approved. The Product Guide continues to read the configured
parent product while the checkout uses the selected variant ID.

## Follow the calls

| File | Role |
| --- | --- |
| `guide.mjs` | Discover the public MCP App resource and its filter from Veyndo. All reads retain the original product and resource. |
| `browser.mjs` | Mount the app HTML in an isolated iframe using the official AppBridge. Only the declared tool can read the chosen product. |
| `layout.mjs` and `openui.mjs` | Admit the panel order and render it with OpenUI. |
| `commerce.mjs` | Read the product family, prepare a cart for the chosen variant and create a Checkout session. Confirm only the current reviewed offer. |
| `server.mjs` | Hold buyer and cart credentials, limit requests to this browser origin, and serve the guide with network access disabled. |

The SDK is pinned to the [0.4.0 release archive](https://github.com/veyndo/sdk/releases/tag/v0.4.0).
The same package makes all Commerce and MCP requests. Checkout calls Core for
the authoritative order and stock transaction. If the confirmation response
is lost, the example looks up the original receipt. It never creates another
order to recover the first one. Veyndo persists the order and the receipt.
The example host keeps its short-lived browser sessions in memory.

The host supports one configured product family and the demo card. For a
full assistant that selects an installed card during an answer, see the
[Veyndo conversation contract](https://www.veyndo.ai/docs/agentic-component-ui.html#show-the-shoppers-app-view-during-the-answer).
