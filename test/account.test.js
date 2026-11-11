import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountClient } from '@veyndo/sdk/account';

test('profile reads and contact replacement reuse the signed-in buyer session', async () => {
  const calls = [];
  const contact = { name: 'Example Buyer', phoneNumber: '+4930123456' };
  const account = createAccountClient({
    baseUrl: 'https://shop.example', shop: 'demo', credentials: 'same-origin',
    fetch: async (url, options) => {
      calls.push([options.method, url.pathname, options.body && JSON.parse(options.body)]);
      assert.equal(options.headers.get('x-tenant'), 'demo');
      assert.equal(options.headers.get('x-customer-token'), 'buyer');
      assert.equal(options.credentials, 'same-origin');
      return Response.json(options.method === 'GET' ? { id: 'customer', profile: contact } : { saved: true });
    },
  });
  const buyer = { customerToken: 'buyer' };
  assert.equal((await account.profile.get(buyer)).id, 'customer');
  assert.deepEqual(await account.profile.save(contact, buyer), { saved: true });
  const path = '/store-api/account/profile';
  assert.deepEqual(calls, [
    ['GET', path, undefined],
    ['PUT', path, { ...contact, address: null }],
  ]);
});

test('address book writes use buyer scope and preserve the address revision', async () => {
  const calls = [];
  const address = { name: 'Buyer', street: 'Test 1', city: 'Berlin', postalCode: '10115', country: 'DE' };
  const buyer = { customerToken: 'buyer' };
  const id = 'address+1';
  const account = createAccountClient({
    baseUrl: 'https://shop.example', shop: 'demo',
    fetch: async (url, options) => {
      calls.push([options.method, url.pathname, options.body && JSON.parse(options.body)]);
      assert.equal(options.headers.get('x-customer-token'), 'buyer');
      assert.equal(options.headers.get('x-tenant'), 'demo');
      return options.method === 'PUT'
        ? new Response(null, { status: 409 })
        : Response.json(options.method === 'GET' ? { elements: [] } : { id });
    },
  });
  assert.deepEqual((await account.addresses.list(buyer)).elements, []);
  const input = { address, defaultShipping: true };
  assert.equal((await account.addresses.create(input, buyer)).id, id);
  await assert.rejects(account.addresses.update(id, { ...input, revision: 7 }, buyer),
    { kind: 'http', status: 409, outcomeUnknown: false });
  await account.addresses.remove(id, { revision: 8 }, buyer);
  await assert.rejects(account.addresses.remove('../foreign', { revision: 8 }, buyer), TypeError);
  const base = '/store-api/account/addresses';
  assert.deepEqual(calls, [
    ['GET', base, undefined],
    ['POST', base, input],
    ['PUT', base + '/address%2B1', { ...input, revision: 7 }],
    ['DELETE', base + '/address%2B1', { revision: 8 }],
  ]);
});

test('receipt download uses the bounded buyer transport and returns PDF bytes', async () => {
  const pdf = '%PDF-1.4\nfixture';
  const account = createAccountClient({
    baseUrl: 'https://shop.example', shop: 'demo', maxResponseBytes: 32,
    credentials: 'same-origin',
    fetch: async (url, options) => {
      assert.equal(url.pathname, '/store-api/account/orders/order%3F1/receipts/receipt%2B1/pdf');
      assert.equal(options.headers.get('accept'), 'application/pdf');
      assert.equal(options.headers.get('x-customer-token'), 'buyer');
      assert.equal(options.headers.get('x-tenant'), 'demo');
      assert.equal(options.redirect, 'error');
      assert.equal(options.cache, 'no-store');
      assert.equal(options.credentials, 'same-origin');
      return new Response(pdf, { headers: { 'Content-Type': 'application/pdf' } });
    },
  });
  assert.deepEqual(await account.orders.receiptPdf('order?1', 'receipt+1', { customerToken: 'buyer' }),
    new TextEncoder().encode(pdf));
  await assert.rejects(account.orders.receiptPdf('order?1', '../other'), TypeError);
});

test('receipt download rejects unexpected, invalid and oversized responses', async () => {
  const cases = [
    [() => Response.json({}), { kind: 'protocol' }],
    [() => new Response('invalid', { headers: { 'Content-Type': 'application/pdf' } }), { kind: 'protocol' }],
    [() => new Response('%PDF-'.repeat(9), { headers: { 'Content-Type': 'application/pdf' } }), { kind: 'protocol' }],
    [() => new Response(null, { status: 404 }), { kind: 'http', status: 404 }],
  ];
  for (const [fetch, expected] of cases) {
    const account = createAccountClient({ baseUrl: 'https://shop.example', maxResponseBytes: 32, fetch });
    await assert.rejects(account.orders.receiptPdf('order', 'receipt'), { ...expected, outcomeUnknown: false });
  }
});

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
