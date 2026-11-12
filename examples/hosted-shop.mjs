/** Run with Node 22+ against a public demo or your own Veyndo API profile. */
import { createHostedShop } from '@veyndo/sdk/hosted';

const shop = createHostedShop({
  shop: process.env.VEYNDO_SHOP ?? 'lumen-story-lab-15-o-98aa4751fa',
  baseUrl: process.env.VEYNDO_URL,
  channel: process.env.VEYNDO_CHANNEL,
  locale: process.env.VEYNDO_LOCALE ?? 'en-GB',
  merchantToken: () => process.env.VEYNDO_TOKEN,
});

try {
  const profile = await shop.describe();
  const { elements, currencyContext, nextCursor } = await shop.catalog.list({ limit: 3 });
  console.log(`${profile.name} · ${shop.baseUrl} · ${shop.shop}`);
  console.table(elements.map(({ id, name, price }) => ({ id, name, price, currency: currencyContext.code })));
  if (nextCursor) console.log('Next page:', nextCursor);
  await shop.mcp.initialize();
  const { tools } = await shop.mcp.tools();
  console.log(`${tools.length} MCP tools available for this scope.`);
} catch (error) {
  console.error(error.message);
  if (error.requestId) console.error('Request ID:', error.requestId);
  if ([401, 403, 404].includes(error.status)) {
    console.error('Check VEYNDO_SHOP, VEYNDO_CHANNEL and the integration key scopes.');
  }
  process.exitCode = 1;
}
