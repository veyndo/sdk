# Use a Veyndo MCP App in another host

Install the [Product Guide example](https://github.com/veyndo/veyndo/blob/main/extensions/apps/assistant-examples/mcp-app.json)
in a Veyndo test shop and add a public guide entry. Run the SDK example from
this repository. It prints the resource identity and the number of rows.

```sh
VEYNDO_URL=http://127.0.0.1:8787 VEYNDO_SHOP=your-test-shop node examples/read-app-view.mjs
```

Set `mcpApps: true` when creating the client and check the extension returned
by `initialize()`. A text-only integration can continue to use `tool()`.
An MCP Apps host reads the linked `_meta.ui.resourceUri` via `resource(uri)`
and gets the complete tool result with `toolResult(name, args, { resourceUri })`.
The last option binds follow-up reads to the same installed Veyndo view.

Use a sandboxed iframe and the [official AppBridge](https://apps.extensions.modelcontextprotocol.io/api/classes/app-bridge.AppBridge.html)
to initialize the view. Deliver the original tool input and result after
`ui/notifications/initialized`. When the view pages or filters, forward its
approved read operation through the same client and resource. Keep credentials
in the host. Never put a merchant token in the HTML, iframe messages or URL.

If the host supports structured model context, advertise
`updateModelContext: { structuredContent: {} }` when initializing the view.
The Product Guide can then send the selected filter as `{tool, field, value}`.
Check it against the last successful read and let the user review it before
including it in the next message. A host without the capability still shows the
app results and filters.
[MCP Apps lifecycle](https://apps.extensions.modelcontextprotocol.io/api/documents/Overview.html#lifecycle).

The [Connected shop example](https://github.com/veyndo/sdk/tree/main/examples/connected-shop)
runs a filterable guide and independent Checkout against the same test shop.
The app reads the configured product. The host controls variant selection and
requires a new purchase review when the selected variant changes.
