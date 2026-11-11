import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountClient } from '@veyndo/sdk/account';

test('account order reads preserve buyer scope and encode the cursor and order ID', async () => {
  const calls = [];
  const order = { id: 'order?1', orderNumber: 'RAC-1', receipts: [] };
  const page = { elements: [order], nextCursor: 'cursor+next' };
  const account = createAccountClient({
    baseUrl: 'https://shop.example', shop: 'demo', credentials: 'same-origin',
    fetch: async (url, options) => {
      calls.push({ url, options });
      return Response.json(url.pathname.endsWith('/orders') ? page : order);
    },
  });
  const buyer = { customerToken: 'fixture-buyer' };
  assert.deepEqual(await account.orders.list(undefined, buyer), page);
  await account.orders.list({ after: page.nextCursor }, buyer);
  assert.deepEqual(await account.orders.detail(order.id, buyer), order);
  assert.equal(calls[0].url.search, '');
  assert.equal(calls[1].url.searchParams.get('after'), 'cursor+next');
  assert.equal(calls[2].url.pathname, '/store-api/account/orders/order%3F1');
  for (const { options } of calls) {
    assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.headers.get('x-tenant'), 'demo');
    assert.equal(options.headers.get('x-customer-token'), 'fixture-buyer');
    assert.equal(options.headers.get('authorization'), null);
  }
});

test('account checks the order ID and keeps refused reads distinguishable', async () => {
  let calls = 0;
  const account = createAccountClient({
    baseUrl: 'https://shop.example',
    fetch: async url => {
      calls++;
      return url.pathname.endsWith('/denied')
        ? new Response(null, { status: 404 })
        : Response.json({ id: 'different-order' });
    },
  });
  for (const id of ['', '.', '..', 'a/b', 'a\\b']) {
    await assert.rejects(account.orders.detail(id), TypeError);
  }
  assert.equal(calls, 0);
  await assert.rejects(account.orders.detail('requested'), { kind: 'protocol', outcomeUnknown: false });
  await assert.rejects(account.orders.detail('denied'), { kind: 'http', status: 404, outcomeUnknown: false });
});
