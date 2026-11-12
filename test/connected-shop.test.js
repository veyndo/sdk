/** Protect the example's resource binding and its recovery path after a lost confirmation. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@veyndo/sdk';
import { createCatalogClient } from '@veyndo/sdk/catalog';
import { createCheckoutClient } from '@veyndo/sdk/checkout';
import { checkout } from '../examples/connected-shop/commerce.mjs';
import { discoverGuide } from '../examples/connected-shop/guide.mjs';
import { a2uiLayout, generateLayout, isLayoutSource, layoutSource, shopCatalog } from '../examples/connected-shop/layout.mjs';

function exampleWithStoreApi(respond, productId) {
  const options = {
    baseUrl: 'https://shop.example', shop: 'fixture',
    fetch: async (url, { body }) => Response.json(await respond(url.pathname, body && JSON.parse(body))),
  };
  return checkout({
    account: createClient(options), catalog: createCatalogClient(options), checkoutClient: createCheckoutClient(options),
  }, productId);
}

test('model output only chooses the first panel for either renderer', async () => {
  const model = text => async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.input, 'checkout');
    return Response.json({ output: [{ content: [{ type: 'output_text', text }] }] });
  };
  const local = { focus: 'checkout', generator: 'local' };
  assert.deepEqual(await generateLayout('checkout'), local);
  assert.deepEqual(await generateLayout('checkout', { key: 'fixture', fetcher: model('{"first":"guide"}') }),
    { focus: 'guide', generator: 'openai' });
  for (const result of ['{"first":"buy"}', '{"first":"guide","totalMinor":"1"}', 'Shop([Pay()])']) {
    assert.deepEqual(await generateLayout('checkout', { key: 'fixture', fetcher: model(result) }), local);
  }
  assert.equal(layoutSource('guide'), 'root = Shop([Guide(), Purchase()])');
  assert.deepEqual(a2uiLayout('guide'), [
    { version: '1.0', createSurface: { surfaceId: 'connected-shop', catalogId: shopCatalog } },
    { version: '1.0', updateComponents: { surfaceId: 'connected-shop', components: [
      { id: 'root', component: 'Shop', children: ['panel_Guide', 'panel_Purchase'] },
      { id: 'panel_Guide', component: 'Guide' },
      { id: 'panel_Purchase', component: 'Purchase' },
    ] } },
  ]);
  assert.equal(isLayoutSource('root = Shop([Guide(), Purchase("chair", 1)])'), false);
  await assert.rejects(generateLayout('constructor'), /valid layout focus/);
});

test('guide filter and pagination remain bound to the selected product and resource', async () => {
  const name = 'app.example_agent_results.list_entries';
  const uri = 'ui://example_agent_results/product';
  const definition = { toolName: name, productReference: 'product_id',
    filter: { name: 'segment', choices: [{ value: 'priority' }] } };
  const calls = [];
  const guide = await discoverGuide({
    initialize: async () => ({ capabilities: { extensions: { 'io.modelcontextprotocol/ui': {} } } }),
    tools: async () => ({ tools: [{ name, _meta: { ui: { resourceUri: uri } } }] }),
    resource: async () => ({ contents: [{ uri, mimeType: 'text/html;profile=mcp-app',
      text: '<!doctype html>', _meta: { 'ai.veyndo/definition': definition } }] }),
    toolResult: async (...args) => {
      calls.push(args);
      return { structuredContent: { elements: [], nextCursor: 'page-two' } };
    },
  }, 'mug');
  const state = {};
  await assert.rejects(guide.read(state, { segment: 'private' }));
  await assert.rejects(guide.read(state, { after: 'invented' }));
  await guide.read(state, { segment: 'priority', product_id: 'foreign' });
  await assert.rejects(guide.read(state, { after: 'page-two' }));
  await guide.read(state, { segment: 'priority', after: 'page-two' });
  assert.deepEqual(calls, [
    [name, { limit: 8, filter: { product_id: 'mug', segment: 'priority' } }, { resourceUri: uri }],
    [name, { limit: 8, filter: { product_id: 'mug', segment: 'priority' }, after: 'page-two' }, { resourceUri: uri }],
  ]);
});

test('a lost confirmation reads the original receipt and never submits a second purchase', async () => {
  const writes = [];
  const state = {
    customerId: 'buyer-1', customerToken: 'fixture',
    review: { receiptLookup: { sessionId: 'session-1', cartId: 'cart-1', customerId: 'buyer-1' }, cartToken: 'cart-token',
      confirmation: { id: 'session-1', confirmed: true, totalMinor: '2490' },
      summary: { reviewKey: 'review-1', item: { id: 'graphite', label: 'Graphite' }, currency: 'EUR', totalMinor: '2490' } },
  };
  const service = exampleWithStoreApi((path, body) => {
    writes.push([path, body]);
    if (path.endsWith('/confirm')) throw new Error('Lost response');
    return { ...body, orderId: 'order-1', orderNumber: 'RAC-1', totalMinor: '2490', currency: 'EUR' };
  }, 'mug');
  const expected = { kind: 'receipt', orderNumber: 'RAC-1', totalMinor: '2490', currency: 'EUR',
    item: { id: 'graphite', label: 'Graphite' } };
  assert.deepEqual(await service.confirm(state, { reviewKey: 'review-1' }), expected);
  assert.deepEqual(await service.confirm(state, { reviewKey: 'review-1' }), expected);
  assert.deepEqual(await service.status(state), expected);
  assert.deepEqual(writes, [
    ['/store-api/checkout/independent/confirm', { id: 'session-1', confirmed: true, totalMinor: '2490' }],
    ['/store-api/checkout/session-receipt', { sessionId: 'session-1', cartId: 'cart-1', customerId: 'buyer-1' }],
  ]);
});

test('variant reviews use current family stock and only the latest quote can be confirmed', async () => {
  const writes = [];
  let selected;
  const parent = { id: 'lamp', name: 'Lamp', stock: 20 };
  const variant = (id, stock) => ({ id, stock, parent_id: 'lamp', options: { finish: id } });
  const review = 'a'.repeat(64);
  const service = exampleWithStoreApi((path, body) => {
    if (path.includes('/product/')) return { familyId: 'lamp', product: parent,
      variants: [parent, variant('brass', 2), variant('graphite', 1), variant('silver', 0)],
      variantsPagination: { hasMore: false } };
    writes.push([path, body]);
    if (path.endsWith('/preview')) {
      assert.equal(body.revision, 1);
      selected = body.items[0].id;
      return { revision: 1, review };
    }
    if (path.endsWith('/cart') && body.session) return { token: 'cart-token', revision: 1 };
    if (path.endsWith('/cart')) {
      assert.deepEqual(body, { revision: 1, review, items: [{ id: selected, quantity: 1 }] });
      return { id: 'cart-' + selected, token: 'cart-token', revision: 2, locale: 'en-GB',
        status: 'open', customerId: 'buyer', lineItems: [{ id: selected }],
        checkout: { paymentMethodId: 'demo-card', country: 'DE' },
        checkoutService: { transport: 'same-origin', legalPolicyVersion: 'demo' },
        shippingCosts: { totalPrice: 0 },
        deliveries: [{ deliveryDate: { earliest: '2026-11-12', latest: '2026-11-13' } }],
        price: { currency: 'EUR', totalMinor: selected === 'brass' ? '6490' : '7990' } };
    }
    if (path.endsWith('/create')) {
      assert.equal(body.context.cart.revision, 2);
      return { id: 'session-' + selected, revision: 1, context: body.context, state: 'draft',
        commerceValidated: false, expiresAt: '2026-11-12T16:00:00Z' };
    }
    assert.ok(path.endsWith('/confirm'));
    return { sessionId: body.id, orderId: 'order', orderNumber: 'RAC-2',
      totalMinor: body.totalMinor, currency: 'EUR' };
  }, 'lamp');
  const state = { customerId: 'buyer', customerToken: 'fixture' };
  for (const itemId of ['foreign', 'lamp', 'silver']) {
    assert.deepEqual(await service.review(state, { itemId }), { kind: 'unavailable' });
  }
  assert.equal(writes.length, 0);
  const brass = await service.review(state, { itemId: 'brass' });
  const graphite = await service.review(state, { itemId: 'graphite' });
  assert.equal(brass.totalMinor, '6490');
  assert.equal(graphite.totalMinor, '7990');
  assert.equal(graphite.delivery.latest, '2026-11-13');
  assert.deepEqual(await service.confirm(state, { reviewKey: brass.reviewKey }), { kind: 'review-again' });
  const receipt = await service.confirm(state, { reviewKey: graphite.reviewKey });
  assert.equal(receipt.item.id, 'graphite');
  assert.equal(writes.filter(([path]) => path.endsWith('/confirm')).length, 1);
  assert.equal(writes.filter(([path]) => path.endsWith('/session-receipt')).length, 0);
});
