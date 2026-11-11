import assert from 'node:assert/strict';
import test from 'node:test';
import { createCheckoutClient } from '@veyndo/sdk/checkout';

const confirmation = {
  id: 'session-1', revision: 1, confirmed: true, totalMinor: '2490',
  country: 'DE', paymentMethod: 'demo-card', legalPolicyVersion: 'a'.repeat(64),
};
const lookup = { sessionId: 'session-1', cartId: 'cart-1', customerId: 'buyer-1' };
const order = {
  sessionId: lookup.sessionId, orderId: 'order-1', orderNumber: 'RAC-1',
  orderState: 'open', paymentState: 'paid', currency: 'EUR', totalMinor: '2490',
};

test('checkout uses the buyer relay and supplies the cart token only for confirmation', async () => {
  const create = { requestKey: 'request-1', expiresIn: 3600, context: {
    cart: { backend: 'native', id: lookup.cartId, revision: 4 },
    salesChannel: 'default', environment: 'live', locale: 'de-DE', currency: 'EUR',
  } };
  const draft = { id: lookup.sessionId, revision: 1, commerceValidated: false, context: create.context };
  const calls = [];
  const client = createCheckoutClient({
    baseUrl: 'https://shop.example', shop: 'demo', credentials: 'same-origin',
    fetch: async (url, input) => {
      calls.push({ url, input });
      if (url.pathname.endsWith('/create')) return Response.json(draft);
      if (url.pathname.endsWith('/confirm')) return Response.json(order);
      return Response.json({ ...order, ...lookup });
    },
  });
  const buyer = { customerToken: 'buyer-token' };
  assert.deepEqual(await client.create(create, buyer), draft);
  assert.deepEqual(await client.confirm(confirmation, { ...buyer, cartToken: 'cart-token' }), order);
  assert.deepEqual(await client.receipt(lookup, buyer), { ...order, ...lookup });
  assert.deepEqual(calls.map(({ url, input }) => [
    url.pathname, input.method, JSON.parse(input.body), input.headers.get('sw-context-token'),
  ]), [
    ['/store-api/checkout/independent/create', 'POST', create, null],
    ['/store-api/checkout/independent/confirm', 'POST', confirmation, 'cart-token'],
    ['/store-api/checkout/session-receipt', 'POST', lookup, null],
  ]);
  for (const { input } of calls) {
    assert.equal(input.headers.get('x-tenant'), 'demo');
    assert.equal(input.headers.get('x-customer-token'), 'buyer-token');
    assert.equal(input.headers.get('authorization'), null);
    assert.equal(input.credentials, 'same-origin');
  }
});

test('checkout reports an uncertain confirmation once and treats receipt lookup as a read', async () => {
  let count = 0;
  const client = createCheckoutClient({
    baseUrl: 'https://shop.example',
    fetch: async () => { count++; return new Response(null, { status: 503 }); },
  });
  await assert.rejects(client.confirm({ ...confirmation, confirmed: false }, { cartToken: 'cart-token' }), TypeError);
  assert.equal(count, 0);
  await assert.rejects(client.confirm(confirmation, { cartToken: 'cart-token' }), { status: 503, outcomeUnknown: true });
  assert.equal(count, 1);
  await assert.rejects(client.receipt(lookup), { status: 503, outcomeUnknown: false });
  assert.equal(count, 2);
});

test('checkout refuses an unrelated receipt and preserves ambiguity after a malformed confirmation', async () => {
  const client = createCheckoutClient({
    baseUrl: 'https://shop.example',
    fetch: async url => Response.json(url.pathname.endsWith('/confirm')
      ? { ...order, totalMinor: '1' }
      : { ...order, ...lookup, cartId: 'different-cart' }),
  });
  await assert.rejects(client.confirm(confirmation, { cartToken: 'cart-token' }), { kind: 'protocol', outcomeUnknown: true });
  await assert.rejects(client.receipt(lookup), { kind: 'protocol', outcomeUnknown: false });
});
