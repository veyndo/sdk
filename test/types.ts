/** Negative compile controls ensure registry arguments are not widened to arbitrary JSON. */
import { createClient, VeyndoError } from '../src/index.js';
import { createCatalogClient } from '@veyndo/sdk/catalog';
import { createCheckoutClient, type CheckoutConfirmation } from '@veyndo/sdk/checkout';
const checkoutClient = createCheckoutClient({ baseUrl: 'https://shop.example', shop: 'demo' });
async function checkCheckout(input: CheckoutConfirmation) {
  const confirmed = await checkoutClient.confirm(input, { cartToken: 'cart-token' });
  const totalMinor: string = confirmed.totalMinor;
  // @ts-expect-error The independent confirmation does not expose the cart ID.
  const cartId = confirmed.cartId;
  const recovered = await checkoutClient.receipt({ sessionId: input.id, cartId: 'cart', customerId: 'buyer' });
  const customer: string = recovered.customerId;
  // @ts-expect-error A confirmation requires explicit buyer approval.
  await checkoutClient.confirm({ ...input, confirmed: false }, { cartToken: 'cart-token' });
  // @ts-expect-error Reviewed minor units are represented by a string.
  await checkoutClient.confirm({ ...input, totalMinor: 2490 }, { cartToken: 'cart-token' });
  void [totalMinor, cartId, customer];
}
void checkCheckout;
async function checkCart() {
  const cart = await checkoutClient.cart.create();
  const access = { cartToken: cart.token };
  const items = [{ id: 'lamp', quantity: 1 }];
  const preview = await checkoutClient.cart.preview({ items, revision: cart.revision }, access);
  const earliest: string | undefined = preview.delivery?.earliest;
  const applied = await checkoutClient.cart.apply({ items, revision: preview.revision, review: preview.review }, access);
  const amount: string | undefined = applied.price.totalMinor;
  // @ts-expect-error Applying a cart proposal requires its review.
  await checkoutClient.cart.apply({ items, revision: cart.revision }, access);
  // @ts-expect-error A current token is required to read an existing cart.
  await checkoutClient.cart.read({});
  void [earliest, amount];
}
void checkCart;
const catalog = createCatalogClient({ baseUrl: 'https://shop.example', shop: 'demo', locale: 'de-DE' });
async function checkCatalog() {
  const page = await catalog.list({ limit: 1, search: 'lamp' });
  if (page.nextCursor) await catalog.list({ after: page.nextCursor });
  const item = page.elements[0];
  const price: number = item.price;
  const detail = await catalog.detail(item.id, { limit: 1 });
  const taxStatus: 'gross' | 'net' = detail.taxStatus;
  // @ts-expect-error Product IDs are strings.
  await catalog.detail(1);
  // @ts-expect-error Cursors are strings.
  await catalog.list({ after: 1 });
  void [price, taxStatus];
}
void checkCatalog;
const client = createClient({ baseUrl: 'https://component.example', shop: 'example' });
void client.tool('knowledge.search', { query: 'Lampe' });
void client.tool('app.care.read', { productId: 'lamp' });
async function checkDraft() {
  const result = await client.tool('automation.validate_flow', { id: 'draft', revision: 0, data: {} });
  const saved: false = result.saved;
  const revision: number = result.revision;
  // @ts-expect-error A validation result is never a saved Flow.
  const written: true = result.saved;
  void [saved, revision, written];
}
void checkDraft;
const typedExternal = createClient<{ 'external.lookup': { id: string } }, { 'external.lookup': { count: number } }>({
  baseUrl: 'https://component.example',
});
void typedExternal.tool('external.lookup', { id: 'item' }).then(result => result.count.toFixed());
// @ts-expect-error The registry requires a string query.
void client.tool('knowledge.search', { query: 123 });
// @ts-expect-error Native operation names are closed by the registry.
void client.tool('invented.operation', {});
// @ts-expect-error checkout.complete requires the declared input contract.
void client.tool('checkout.complete', { idempotency_key: 123 });
const error = new VeyndoError('fixture');
const uncertain: boolean = error.outcomeUnknown;
void uncertain;
const external = createClient<{ 'external.search': { term: string } }>({ baseUrl: 'https://component.example' });
void external.tool('external.search', { term: 'chair' });
// @ts-expect-error An external component retains its own input contract.
void external.tool('external.search', { term: 123 });
import { createHostClient } from '../src/host.js';
const host = createHostClient({ baseUrl: 'https://host.example', appId:'marketplaces' });
void host.call('job_enqueue', { action:'sync', input:{ connectionId:'one', kind:'orders' }, requestKey:'request-1' });
void host.call('channel_product', { channelId:'one', id:'product', currency:'EUR' });
// @ts-expect-error A durable job requires an explicit stable request key.
void host.call('job_enqueue', { action:'sync', input:{} });
// @ts-expect-error Host operations are closed by the shared native contract.
void host.call('arbitrary_sql', { query:'select * from tenants' });
// @ts-expect-error Money uses exact integer minor units, not decimal strings.
void host.call('order_import', { totalMinor:'12.99' });

import { createComposition, createLayoutRegistry } from '../src/composition.js';
const composed = createComposition({ services: [{ id: 'core', client: createClient({ baseUrl: 'https://example.com' }) }], context: { shop: 'demo' }, views: [
  { id: 'products', title: 'Products', version: 1, service: 'core', operation: 'catalog.search', effect: 'read', arguments: () => ({}) },
] });
composed.discover(); composed.read({ version: 1, panels: [] }, 'x');
createLayoutRegistry([{ id: 'a', title: 'A', version: 1 }]);

import { createKnowledgeClient } from '@veyndo/sdk/knowledge';
const knowledge = createKnowledgeClient({ baseUrl: 'https://knowledge.example', expectedTenant: 'shop-a', token: 'fixture' });
async function inspectEvidence() {
  const page = await knowledge.products.list({ limit: 1 });
  if (page.nextCursor !== null) await knowledge.products.list({ after: page.nextCursor });
  const result = await knowledge.products.search({ query: 'chair', locale: 'de-DE', mainLocale: 'en-GB' });
  const productId: string = result.sources[0].productId;
  await knowledge.products.current(result);
  // @ts-expect-error Product evidence cannot be checked as a private document.
  await knowledge.documents.current(result);
  // @ts-expect-error Private documents cannot use an exact product filter.
  await knowledge.documents.search({ query: 'chair', locale: 'de-DE', mainLocale: 'en-GB', productId });
  // @ts-expect-error A write requires its expected revision.
  await knowledge.documents.withdraw({ id: 'returns' });
}
void inspectEvidence;
