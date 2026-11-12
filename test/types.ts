import { createA2uiAdapter, type A2uiLayoutMessage } from '@veyndo/sdk/a2ui';
/** Negative compile controls ensure registry arguments are not widened to arbitrary JSON. */
import { createClient, VeyndoError } from '../src/index.js';
import { createCatalogClient } from '@veyndo/sdk/catalog';
import { createAccountClient } from '@veyndo/sdk/account';
const accountClient = createAccountClient({ baseUrl: 'https://shop.example' });
async function checkAccount() {
  const buyer = { customerToken: 'buyer' };
  const credentials = { email: 'buyer@example.test', password: 'example' };
  const signedIn = await accountClient.session.signIn(credentials, { cartToken: 'current-cart' });
  await accountClient.session.signOut({ cartToken: signedIn.token });
  const updated: true = (await accountClient.session.changePassword({
    oldPassword: 'previous-example', newPassword: 'new-example',
  })).changed;
  void updated;
  // @ts-expect-error Sign-in requires the open cart token.
  await accountClient.session.signIn(credentials, {});
  const registered = await accountClient.token.register({ ...credentials, name: 'Example Buyer' });
  await accountClient.profile.get(registered);
  const signedInOnServer = await accountClient.token.signIn(credentials, { cartToken: 'current-cart' });
  const replacement = await accountClient.token.changePassword({
    oldPassword: 'previous-example', newPassword: 'new-example',
  }, signedInOnServer);
  await accountClient.token.signOut({ ...replacement, cartToken: signedInOnServer.token });
  // @ts-expect-error Server-side sign-out requires a current buyer token.
  await accountClient.token.signOut({ cartToken: signedInOnServer.token });
  const [download] = (await accountClient.downloads.list(buyer)).elements;
  const file = await accountClient.downloads.file(download.orderId, download.id, buyer);
  const bytes: Uint8Array = file.bytes;
  void bytes;
  const profile = await accountClient.profile.get(buyer);
  const email: string = profile.email;
  await accountClient.profile.save({ name: 'Example Buyer', phoneNumber: '+4930123456' }, buyer);
  // @ts-expect-error Account identity is not editable contact data.
  await accountClient.profile.save({ name: 'Example Buyer', email }, buyer);
  const book = await accountClient.addresses.list(buyer);
  const address = book.elements[0];
  await accountClient.addresses.update(address.id, { address: address.address, revision: address.revision }, buyer);
  // @ts-expect-error Address updates require the address revision.
  await accountClient.addresses.update(address.id, { address: address.address }, buyer);
  const page = await accountClient.orders.list(undefined, buyer);
  if (page.nextCursor) await accountClient.orders.list({ after: page.nextCursor }, buyer);
  const detail = await accountClient.orders.detail(page.elements[0].id, buyer);
  const path: string = detail.receipts[0].pdfPath;
  const number: string = detail.orderNumber;
  // @ts-expect-error Order cursors are strings.
  await accountClient.orders.list({ after: 1 }, buyer);
  // @ts-expect-error Order history never carries a cart token.
  const token = detail.cart.token;
  void [path, number, token];
}
void checkAccount;
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
  const discounted = await checkoutClient.cart.setCoupons({ codes: ['WELCOME'], revision: applied.revision }, access);
  const currency = discounted.availableCurrencies?.[0] ?? discounted.price.currency;
  const repriced = await checkoutClient.cart.setCurrency({ currency, revision: discounted.revision }, access);
  const discount: number | undefined = repriced.discountTotal;
  // @ts-expect-error A coupon change requires the current cart revision.
  await checkoutClient.cart.setCoupons({ codes: [] }, access);
  // @ts-expect-error Applying a cart proposal requires its review.
  await checkoutClient.cart.apply({ items, revision: cart.revision }, access);
  // @ts-expect-error A current token is required to read an existing cart.
  await checkoutClient.cart.read({});
  void [earliest, amount, discount];
}
void checkCart;
async function checkSelection() {
  const cart = await checkoutClient.cart.create();
  const access = { cartToken: cart.token };
  const options = await checkoutClient.options(access);
  const shippingPrice: number = options.shipping[0].price;
  const checkout = { country: options.countries[0], shippingMethodId: options.shipping[0].id,
    paymentMethodId: options.payments[0].id };
  const selected = await checkoutClient.select({ revision: cart.revision, checkout }, access);
  const selectedMethod: string = selected.checkout.shippingMethodId;
  // @ts-expect-error A selection needs an explicit cart revision.
  await checkoutClient.select({ checkout }, access);
  // @ts-expect-error A selection needs an explicit payment method.
  await checkoutClient.select({ revision: cart.revision, checkout: { country: 'DE', shippingMethodId: 'standard' } }, access);
  void [shippingPrice, selectedMethod];
}
void checkSelection;
const catalog = createCatalogClient({ baseUrl: 'https://shop.example', shop: 'demo', locale: 'de-DE' });
async function checkCatalog() {
  const context = await catalog.context();
  const locale: string = context.locale;
  const navigation = await catalog.navigation({ signal: new AbortController().signal });
  const categoryId: string = navigation.elements[0].id;
  await catalog.list({ categoryId });
  void locale;
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


const workspaceAdapter = createA2uiAdapter({ catalogId: 'demo:workspace', views: [
  { view: 'commerce.products', version: 1, component: 'Products' },
] });
const presentation = workspaceAdapter.project({ admit: () => null }, {}, {
  surfaceId: 'demo', capabilities: { '1.0': { supportedCatalogIds: ['demo:workspace'] } },
});
if (presentation.kind === 'a2ui') {
  const messages: A2uiLayoutMessage[] = presentation.messages;
  void messages;
}

import { createHostedShop } from '@veyndo/sdk/hosted';
const hosted = createHostedShop({ shop: 'demo', merchantToken: () => 'server-token' });
async function checkHosted() {
  const mode: 'api-only' = (await hosted.describe()).mode;
  const id: string = (await hosted.catalog.list({ limit: 1 })).elements[0].id;
  await hosted.mcp.tool('catalog.search', { query: 'chair' });
  // @ts-expect-error The hosted client requires an explicit shop.
  createHostedShop({});
  void [mode, id];
}
void checkHosted;

async function checkPreparedCheckout(cart: import('@veyndo/sdk/checkout').StoreCart) {
  const draft = await hosted.checkout.prepare(cart, { requestKey: 'stable-cart-revision-key' });
  const total: string = draft.confirmation.totalMinor;
  // @ts-expect-error Preparing a draft is not buyer approval.
  await hosted.checkout.confirm(draft.confirmation, { cartToken: cart.token });
  await hosted.checkout.confirm({ ...draft.confirmation, confirmed: true }, { cartToken: cart.token });
  await hosted.checkout.receipt(draft.receiptLookup);
  void total;
}
void checkPreparedCheckout;
