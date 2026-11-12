# Connected shop

Open a product from Veyndo in an external web app. Ask for its guide, filter
the installed MCP App in the conversation, choose a variant, then review and
confirm a simulated purchase through independent Checkout. The example uses a fixed guide question
so it runs without a model API key.

## Run it

Use an isolated loopback Veyndo demo shop with independent Checkout enabled
through Core's same origin Store API. The example uses `checkout.prepare` for the draft and recovers the same order if the confirmation response is lost. Follow the [private Checkout setup](https://www.veyndo.ai/docs/checkout-component.html#route-a-test-shop-through-private-checkout).
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

### Compare OpenUI and A2UI

Use the renderer links at the top of the example to switch between OpenUI and
A2UI. Both arrange the same Purchase and Product Guide panels. The A2UI link
requests v1.0 JSON messages and loads the official Lit renderer with the
example's registered component catalog. The host uses the shared
[A2UI workspace adapter](../../docs/composition.md#render-an-admitted-workspace-with-a2ui).
The OpenUI link uses OpenUI Lang.

Append `#guide` to the example URL to ask for the guide first. With an
`OPENAI_API_KEY` in the Node environment, OpenAI chooses the order of those
two panels. Set `OPENAI_MODEL` to select a different model. The model receives
only the requested focus. The local layout is available without a key and
also serves as the fallback for invalid or unavailable model responses.

Both renderers place the host's existing controls. The model receives no
price, variant ID, cart token or confirmation capability. The MCP App continues
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
| `layout.mjs`, `openui.mjs` and `a2ui.mjs` | Choose the panel order and render it with the selected layout protocol. |
| `commerce.mjs` | Read the family with the catalog client. Preview and apply the variant basket, create a Checkout session and confirm only the current offer. |
| `server.mjs` | Hold buyer and cart credentials, limit requests to this browser origin, and serve the guide with network access disabled. |

The example installs the SDK directly from this checkout. Clone the SDK repository before running it.
The Node host uses `@veyndo/sdk/catalog` for product detail and
`@veyndo/sdk/checkout` for cart review, confirmation and recovery. It uses
the base client for demo buyer setup and MCP discovery. Checkout calls Core for
the authoritative order and stock transaction. If the confirmation response
is lost, the example looks up the original receipt. It never creates another
order to recover the first one. Successful confirmation returns the
session and order IDs. The separate lookup also returns the cart and buyer
IDs, which the host checks before displaying the recovered order.
Veyndo persists the order and the receipt.
The example host keeps its short-lived browser sessions in memory.

The host supports one configured product family and the demo card. The
A2UI catalog places two known panels. Variant selection, guide filtering,
quote updates and order recovery use the same SDK calls in both modes. For a
full assistant that selects an installed card during an answer, see the
[Veyndo conversation contract](https://www.veyndo.ai/docs/agentic-component-ui.html#show-the-shoppers-app-view-during-the-answer).
