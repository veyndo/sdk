/** Protect the example's resource binding and its recovery path after a lost confirmation. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkout } from '../examples/connected-shop/commerce.mjs';
import { discoverGuide } from '../examples/connected-shop/guide.mjs';
import { generateLayout, isLayoutSource, layoutSource } from '../examples/connected-shop/layout.mjs';

test('generated OpenUI changes panel order without introducing actions or purchase data', async () => {
  const model = text => async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.input, 'checkout');
    return Response.json({ output: [{ content: [{ type: 'output_text', text }] }] });
  };
  const local = { source: layoutSource('checkout'), generator: 'local' };
  assert.deepEqual(await generateLayout('checkout'), local);
  assert.deepEqual(await generateLayout('checkout', { key: 'fixture', fetcher: model('{"first":"guide"}') }),
    { source: layoutSource('guide'), generator: 'openai' });
  for (const result of ['{"first":"buy"}', '{"first":"guide","totalMinor":"1"}', 'Shop([Pay()])']) {
    assert.deepEqual(await generateLayout('checkout', { key: 'fixture', fetcher: model(result) }), local);
  }
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
    customerId: 'buyer-1', headers: { 'x-customer-token': 'fixture' },
    review: { id: 'session-1', cartId: 'cart-1', confirmation: { id: 'session-1' },
      summary: { reviewKey: 'review-1', item: { id: 'graphite', label: 'Graphite' } } },
  };
  const service = checkout({
    async request(path, { body }) {
      writes.push([path, body]);
      if (path.endsWith('/confirm')) throw Object.assign(new Error('Lost response'), { outcomeUnknown: true });
      return { cartId: 'cart-1', orderId: 'order-1', orderNumber: 'RAC-1', totalMinor: '2490', currency: 'EUR' };
    },
  }, 'mug');
  const expected = { kind: 'receipt', orderNumber: 'RAC-1', totalMinor: '2490', currency: 'EUR',
    item: { id: 'graphite', label: 'Graphite' } };
  assert.deepEqual(await service.confirm(state, { reviewKey: 'review-1' }), expected);
  assert.deepEqual(await service.confirm(state, { reviewKey: 'review-1' }), expected);
  assert.deepEqual(await service.status(state), expected);
  assert.deepEqual(writes, [
    ['/store-api/checkout/independent/confirm', { id: 'session-1' }],
    ['/store-api/checkout/session-receipt', { sessionId: 'session-1', cartId: 'cart-1', customerId: 'buyer-1' }],
  ]);
});

test('variant reviews use current family stock and only the latest quote can be confirmed', async () => {
  const writes = [];
  let selected;
  const parent = { id: 'lamp', name: 'Lamp', stock: 20 };
  const variant = (id, stock) => ({ id, stock, parent_id: 'lamp', options: { finish: id } });
  const service = checkout({
    async request(path, { body }) {
      if (path.includes('/product/')) return { familyId: 'lamp', product: parent,
        variants: [parent, variant('brass', 2), variant('graphite', 1), variant('silver', 0)],
        variantsPagination: { hasMore: false } };
      writes.push([path, body]);
      if (path.endsWith('/cart')) return { token: 'cart-token' };
      if (path.endsWith('/line-item')) {
        selected = body.items[0].referencedId;
        return { id: 'cart-' + selected, revision: 1, locale: 'en-GB',
          checkout: { paymentMethodId: 'demo-card', country: 'DE' },
          checkoutService: { transport: 'same-origin', legalPolicyVersion: 'demo' },
          shippingCosts: { totalPrice: 0 },
          deliveries: [{ deliveryDate: { earliest: '2026-11-12', latest: '2026-11-13' } }],
          price: { currency: 'EUR', totalMinor: selected === 'brass' ? '6490' : '7990' } };
      }
      if (path.endsWith('/create')) return { id: 'session-' + selected, revision: 1 };
      assert.ok(path.endsWith('/confirm'));
      return { orderId: 'order', orderNumber: 'RAC-2', cartId: 'cart-' + selected,
        totalMinor: body.totalMinor, currency: 'EUR' };
    },
  }, 'lamp');
  const state = { customerId: 'buyer', headers: { 'x-customer-token': 'fixture' } };
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
});
