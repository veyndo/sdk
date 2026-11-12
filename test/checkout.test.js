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

test('cart review and apply preserve scope, revision and the original proposal', async () => {
  const calls = [];
  const proposal = { items: [{ id: 'lamp', quantity: 1 }], revision: 7 };
  const review = 'a'.repeat(64);
  const client = createCheckoutClient({
    baseUrl: 'https://shop.example', shop: 'demo', channel: 'uk', locale: 'en-GB', currency: 'GBP',
    fetch: async (url, args) => {
      calls.push({ url, args });
      return Response.json(url.pathname.endsWith('/preview') ? { review } : { id: 'cart' });
    },
  });
  const access = { cartToken: 'cart-token', customerToken: 'buyer-token' };
  assert.throws(() => client.cart.read({}), TypeError);
  assert.throws(() => client.cart.apply({ items: proposal.items, review }, access), TypeError);
  assert.throws(() => client.cart.apply({ ...proposal, review: 'invalid' }, access), TypeError);
  assert.equal(calls.length, 0);

  await client.cart.create({ session: 'fixture' }, { customerToken: 'buyer-token' });
  await client.cart.read(access);
  await client.cart.add({ items: [{ referencedId: 'lamp', quantity: 1 }] }, access);
  assert.equal((await client.cart.preview(proposal, access)).review, review);
  await client.cart.apply({ ...proposal, review }, access);
  assert.deepEqual(calls.map(({ url, args }) => [
    url.pathname, args.method, args.body && JSON.parse(args.body), args.headers.get('sw-context-token'),
  ]), [
    ['/store-api/checkout/cart', 'POST', { session: 'fixture' }, null],
    ['/store-api/checkout/cart', 'GET', undefined, 'cart-token'],
    ['/store-api/checkout/cart/line-item', 'POST', { items: [{ referencedId: 'lamp', quantity: 1 }] }, 'cart-token'],
    ['/store-api/checkout/cart/preview', 'POST', proposal, 'cart-token'],
    ['/store-api/checkout/cart', 'PUT', { ...proposal, review }, 'cart-token'],
  ]);
  for (const { args } of calls) {
    assert.equal(args.headers.get('x-tenant'), 'demo');
    assert.equal(args.headers.get('x-customer-token'), 'buyer-token');
    assert.equal(args.headers.get('sw-sales-channel-id'), 'uk');
    assert.equal(args.headers.get('x-commerce-locale'), 'en-GB');
    assert.equal(args.headers.get('x-commerce-currency'), 'GBP');
  }
});

test('a failed cart preview is a failed read and a failed apply may have been written', async () => {
  const client = createCheckoutClient({
    baseUrl: 'https://shop.example',
    fetch: async () => new Response(null, { status: 503 }),
  });
  const proposal = { items: [], revision: 1 };
  const access = { cartToken: 'cart-token' };
  await assert.rejects(client.cart.preview(proposal, access), { status: 503, outcomeUnknown: false });
  await assert.rejects(client.cart.apply({ ...proposal, review: 'a'.repeat(64) }, access), {
    status: 503, outcomeUnknown: true,
  });
});

test('checkout discovers candidates and saves an explicit choice at the cart revision', async () => {
  const calls = [];
  const candidates = { countries: ['DE'], shipping: [{ id: 'standard' }], payments: [{ id: 'demo-card' }], revision: 2 };
  const choice = { country: 'DE', shippingMethodId: 'standard', paymentMethodId: 'demo-card' };
  const input = { revision: 7, checkout: choice };
  const client = createCheckoutClient({
    baseUrl: 'https://shop.example', shop: 'demo', locale: 'de-DE',
    fetch: async (url, args) => {
      calls.push({ url, args });
      return Response.json(args.method === 'GET' ? candidates : { checkout: choice, revision: 8 });
    },
  });
  const access = { cartToken: 'cart-token', customerToken: 'buyer-token' };
  assert.throws(() => client.options({ cartToken: '' }), TypeError);
  assert.throws(() => client.select({ ...input, revision: 1.2 }, access), TypeError);
  assert.throws(() => client.select({ ...input, checkout: { ...choice, paymentMethodId: '' } }, access), TypeError);
  assert.equal(calls.length, 0);
  assert.deepEqual(await client.options(), candidates);
  assert.deepEqual(await client.options(access), candidates);
  assert.deepEqual(await client.select(input, access), { checkout: choice, revision: 8 });
  assert.deepEqual(calls.map(({ url, args }) => [
    url.pathname, args.method, args.headers.get('sw-context-token'), args.headers.get('x-customer-token'),
  ]), [
    ['/store-api/checkout/options', 'GET', null, null],
    ['/store-api/checkout/options', 'GET', 'cart-token', 'buyer-token'],
    ['/store-api/checkout/context', 'PUT', 'cart-token', 'buyer-token'],
  ]);
  assert.deepEqual(JSON.parse(calls[2].args.body), input);
  for (const { args } of calls) {
    assert.equal(args.headers.get('x-tenant'), 'demo');
    assert.equal(args.headers.get('x-commerce-locale'), 'de-DE');
  }
});

function preparedCart(overrides = {}) {
  return {
    id: 'cart-1', revision: 7, status: 'open', customerId: 'buyer-1', locale: 'de-DE',
    lineItems: [{ id: 'lamp' }], price: { currency: 'EUR', totalMinor: '12990' },
    checkout: { country: 'DE', paymentMethodId: 'test-paypal' },
    checkoutService: { transport: 'same-origin', legalPolicyVersion: 'policy-v2', paypalSandbox: true },
    ...overrides,
  };
}

test('prepares a checkout from the exact quote and leaves confirmation to the caller', async () => {
  const requests = [];
  const checkout = createCheckoutClient({ baseUrl: 'https://shop.example', shop: 'lumen', channel: 'b2c',
    async fetch(url, request) {
      const body = JSON.parse(request.body);
      requests.push({ path: url.pathname, body });
      assert.equal(request.headers.get('x-customer-token'), 'buyer-token');
      assert.equal(request.headers.get('sw-sales-channel-id'), 'b2c');
      assert.equal(request.headers.has('sw-context-token'), false);
      return Response.json({ id: 'session-1', revision: 3, state: 'draft', commerceValidated: false,
        expiresAt: '2026-11-12T16:00:00Z', context: body.context });
    },
  });
  const { confirmation, receiptLookup } = await checkout.prepare(preparedCart(), {
    requestKey: 'buyer-cart-1-r7', customerToken: 'buyer-token',
  });
  assert.deepEqual(requests, [{ path: '/store-api/checkout/independent/create', body: {
    requestKey: 'buyer-cart-1-r7', expiresIn: 900, context: {
      cart: { backend: 'native', id: 'cart-1', revision: 7 }, salesChannel: 'b2c', environment: 'live',
      locale: 'de-DE', currency: 'EUR', country: 'DE',
    },
  } }]);
  assert.deepEqual(confirmation, {
    id: 'session-1', revision: 3, totalMinor: '12990', country: 'DE', paymentMethod: 'test-paypal',
    legalPolicyVersion: 'policy-v2', paypalSandbox: true,
  });
  assert.deepEqual(receiptLookup, { sessionId: 'session-1', cartId: 'cart-1', customerId: 'buyer-1' });
});

test('refuses an unreviewed cart and stops when the checkout draft response changes scope', async () => {
  let calls = 0;
  const checkout = createCheckoutClient({ baseUrl: 'https://shop.example', async fetch(_, request) {
    calls++;
    const { context } = JSON.parse(request.body);
    return Response.json({ id: 'session-1', revision: 1, state: 'draft', commerceValidated: false,
      expiresAt: '2026-11-12T16:00:00Z', context: { ...context, salesChannel: 'foreign' } });
  } });
  for (const mismatch of [{ selectionNeedsConfirmation: true }, { lineItems: [] },
    { customerId: null }, { price: { currency: 'EUR', totalMinor: 12990 } },
    { checkoutService: { transport: 'direct', legalPolicyVersion: 'policy-v2' } }]) {
    await assert.rejects(checkout.prepare(preparedCart(mismatch), { requestKey: 'buyer-cart-1-r7' }), TypeError);
  }
  assert.equal(calls, 0);
  await assert.rejects(checkout.prepare(preparedCart(), { requestKey: 'buyer-cart-1-r7' }),
    error => error.kind === 'protocol' && error.outcomeUnknown === true);
  assert.equal(calls, 1);
});
