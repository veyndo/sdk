/** Protect the example's resource binding and its recovery path after a lost confirmation. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkout } from '../examples/connected-shop/commerce.mjs';
import { discoverGuide } from '../examples/connected-shop/guide.mjs';

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
    review: { id: 'session-1', cartId: 'cart-1', confirmation: { id: 'session-1' } },
  };
  const service = checkout({
    async request(path, { body }) {
      writes.push([path, body]);
      if (path.endsWith('/confirm')) throw Object.assign(new Error('Lost response'), { outcomeUnknown: true });
      return { cartId: 'cart-1', orderId: 'order-1', orderNumber: 'RAC-1', totalMinor: '2490', currency: 'EUR' };
    },
  }, 'mug');
  const expected = { kind: 'receipt', orderNumber: 'RAC-1', totalMinor: '2490', currency: 'EUR' };
  assert.deepEqual(await service.confirm(state), expected);
  assert.deepEqual(await service.confirm(state), expected);
  assert.deepEqual(await service.status(state), expected);
  assert.deepEqual(writes, [
    ['/store-api/checkout/independent/confirm', { id: 'session-1' }],
    ['/store-api/checkout/session-receipt', { sessionId: 'session-1', cartId: 'cart-1', customerId: 'buyer-1' }],
  ]);
});
