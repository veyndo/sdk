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

test('payment status and return reconciliation preserve the original buyer and cart scope', async () => {
  const access = { cartToken: 'original-cart', customerToken: 'buyer-token' };
  const status = {
    id: 'attempt-1', state: 'ready', checkout: 'redirect', currency: 'EUR', currencyScale: 2,
    amountMinor: 2490, capturedMinor: 0, refundedMinor: 0, approvalUrl: 'https://www.sandbox.paypal.com/checkout',
  };
  const job = { queued: true, jobId: 'job-1' };
  const calls = [];
  let result = status;
  const { payment } = createCheckoutClient({
    baseUrl: 'https://shop.example', shop: 'demo', channel: 'external',
    fetch: async (url, request) => {
      calls.push({ path: url.pathname, method: request.method, body: request.body });
      assert.equal(request.headers.get('x-tenant'), 'demo');
      assert.equal(request.headers.get('sw-sales-channel-id'), 'external');
      assert.equal(request.headers.get('sw-context-token'), access.cartToken);
      assert.equal(request.headers.get('x-customer-token'), access.customerToken);
      assert.equal(request.headers.get('authorization'), null);
      return Response.json(result);
    },
  });
  await assert.rejects(payment.status('../attempt-1', access), TypeError);
  await assert.rejects(payment.status(status.id, {}), TypeError);
  await assert.rejects(payment.reconcile(status.id, { requestKey: 'short' }, access), TypeError);
  assert.equal(calls.length, 0);

  assert.deepEqual(await payment.status(status.id, access), status);
  assert.equal(calls[0].path, '/store-api/payments/attempt-1');
  assert.equal(calls[0].method, 'GET');
  for (const invalid of [
    { id: 'other-attempt' }, { approvalUrl: 'javascript:void(0)' },
    { approvalUrl: 'https://buyer:secret@example.test' }, { amountMinor: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    result = { ...status, ...invalid };
    await assert.rejects(payment.status(status.id, access), { kind: 'protocol', outcomeUnknown: false });
  }

  const input = { requestKey: 'attempt-1:return' };
  result = job;
  assert.deepEqual(await payment.reconcile(status.id, input, access), job);
  assert.deepEqual(await payment.reconcile(status.id, input, access), job);
  for (const call of calls.slice(-2)) {
    assert.equal(call.path, '/store-api/payments/attempt-1/reconcile');
    assert.equal(call.method, 'POST');
    assert.deepEqual(JSON.parse(call.body), input);
  }
  result = { ...job, queued: false };
  await assert.rejects(payment.reconcile(status.id, input, access), { kind: 'protocol', outcomeUnknown: true });
});

test('place binds a native order to the exact reviewed cart and supports a stable replay', async () => {
  const access = { cartToken: 'cart-token', customerToken: 'buyer-token' };
  const cart = { id: 'cart-1', token: access.cartToken, revision: 7, status: 'open',
    lineItems: [{ id: 'lamp', quantity: 1 }],
    checkout: { paymentMethodId: 'shopware-payments-pui' }, price: { currency: 'EUR', totalMinor: '2490' } };
  const order = { id: 'order-1', orderNumber: 'RAC-1', state: 'placed', cart,
    payment: { method: { id: cart.checkout.paymentMethodId }, provider: 'shopware_payments',
      state: 'pending', attemptId: 'attempt-1', realMoneyCharged: false } };
  const input = { requestKey: 'stable-order-key', confirmed: true };
  let calls = 0;
  let response = order;
  const { place } = createCheckoutClient({
    baseUrl: 'https://shop.example', shop: 'demo', channel: 'external', locale: 'de-DE',
    fetch: async (url, request) => {
      calls++;
      assert.equal(url.pathname, '/store-api/checkout/order');
      assert.equal(request.method, 'POST');
      assert.equal(request.body, undefined);
      for (const [name, value] of Object.entries({
        'x-tenant': 'demo', 'sw-sales-channel-id': 'external', 'x-commerce-locale': 'de-DE',
        'sw-context-token': access.cartToken, 'x-customer-token': access.customerToken,
        'idempotency-key': input.requestKey, 'x-commerce-currency': 'EUR',
        'x-commerce-cart-revision': '7', 'x-commerce-total-minor': '2490',
      })) assert.equal(request.headers.get(name), value);
      assert.equal(request.headers.get('authorization'), null);
      if (calls === 1) throw new Error('Response dropped');
      return Response.json(response);
    },
  });
  await assert.rejects(place(cart, { ...input, confirmed: false }, access), TypeError);
  await assert.rejects(place(cart, { ...input, requestKey: 'short' }, access), TypeError);
  await assert.rejects(place(cart, input, { ...access, cartToken: 'different' }), TypeError);
  await assert.rejects(place({ ...cart, selectionNeedsConfirmation: true }, input, access), TypeError);
  await assert.rejects(place({ ...cart, price: { ...cart.price, totalMinor: 2490 } }, input, access), TypeError);
  assert.equal(calls, 0);

  await assert.rejects(place(cart, input, access), { kind: 'network', outcomeUnknown: true });
  assert.equal(calls, 1);
  assert.deepEqual(await place(cart, input, access), order);
  response = { ...order, cart: { ...cart, revision: cart.revision + 1 } };
  await assert.rejects(place(cart, input, access), { kind: 'protocol', outcomeUnknown: true });
  response = { ...order, payment: { ...order.payment, method: { id: 'demo-card' } } };
  await assert.rejects(place(cart, input, access), { kind: 'protocol', outcomeUnknown: true });
});

test('invoice instructions distinguish pending, available and unsupported without changing payment state', async () => {
  const access = { cartToken: 'original-cart', customerToken: 'buyer-token', signal: new AbortController().signal };
  const amount = { amountMinor: 2490, currency: 'EUR', currencyScale: 2, simulated: true };
  const instructions = { kind: 'bank_transfer', paymentReference: 'RAC-123',
    iban: 'DE89370400440532013000', bic: 'DEUTDEFFXXX', bankName: 'Fixture bank', accountHolderName: 'Fixture recipient' };
  const pending = { ...amount, status: 'pending', instructions: null };
  const available = { ...amount, status: 'available', instructions };
  let response = { status: 'unsupported', instructions: null };
  let calls = 0;
  const { payment } = createCheckoutClient({
    baseUrl: 'https://shop.example', shop: 'demo', channel: 'external',
    fetch: async (url, request) => {
      calls++;
      assert.equal(url.pathname, '/store-api/payments/attempt-1/instructions');
      assert.equal(request.method, 'GET');
      assert.equal(request.headers.get('x-tenant'), 'demo');
      assert.equal(request.headers.get('sw-sales-channel-id'), 'external');
      assert.equal(request.headers.get('sw-context-token'), access.cartToken);
      assert.equal(request.headers.get('x-customer-token'), access.customerToken);
      return Response.json(response);
    },
  });
  await assert.rejects(payment.instructions('../attempt-1', access), TypeError);
  await assert.rejects(payment.instructions('attempt-1', {}), TypeError);
  assert.equal(calls, 0);
  assert.deepEqual(await payment.instructions('attempt-1', access), response);
  response = pending;
  assert.deepEqual(await payment.instructions('attempt-1', access), pending);
  response = { ...available, instructions: { ...instructions, internal: 'omit this' } };
  assert.deepEqual(await payment.instructions('attempt-1', access), available);
  for (const invalid of [
    { ...available, instructions: null }, { ...pending, instructions },
    { ...available, amountMinor: Number.MAX_SAFE_INTEGER + 1 },
    { ...available, instructions: { ...instructions, paymentReference: ' ' } },
  ]) {
    response = invalid;
    await assert.rejects(payment.instructions('attempt-1', access), { kind: 'protocol', outcomeUnknown: false });
  }
});

test('address choices join channel countries with localized regions and retain method candidates', async () => {
  const availability = {
    countries: ['US', 'DE'], mainLocale: 'en-GB', shipping: [{ id: 'standard' }], payments: [{ id: 'demo-card' }],
  };
  const catalogue = { countries: [
    { code: 'DE', name: { 'de-DE': 'Deutschland', en: 'Germany' }, states: [] },
    { code: 'CH', name: { de: 'Schweiz' }, states: [] },
    { code: 'US', name: { de: 'Vereinigte Staaten' }, states: [
      { code: 'US-CA', name: { 'en-GB': 'California', en: 'Other translation' } },
    ] },
  ] };
  const requests = [];
  const { addressOptions } = createCheckoutClient({
    baseUrl: 'https://shop.example', shop: 'demo', channel: 'external', locale: 'de-DE',
    fetch: async (url, request) => {
      requests.push(url.pathname);
      const isCheckoutOptions = url.pathname === '/store-api/checkout/options';
      assert.equal(request.method, 'GET');
      assert.equal(request.headers.get('x-tenant'), 'demo');
      assert.equal(request.headers.get('sw-sales-channel-id'), 'external');
      assert.equal(request.headers.get('x-commerce-locale'), 'de-DE');
      assert.equal(request.headers.get('sw-context-token'), isCheckoutOptions ? 'cart-token' : null);
      assert.equal(request.headers.get('x-customer-token'), isCheckoutOptions ? 'buyer-token' : null);
      return Response.json(isCheckoutOptions ? availability : catalogue);
    },
  });
  const access = { cartToken: 'cart-token', customerToken: 'buyer-token' };
  assert.deepEqual(await addressOptions(access), { ...availability, countries: [
    { code: 'US', label: 'Vereinigte Staaten', requiresRegion: true,
      regions: [{ code: 'US-CA', label: 'California' }] },
    { code: 'DE', label: 'Deutschland', requiresRegion: false, regions: [] },
  ] });
  assert.deepEqual(requests.sort(), ['/store-api/checkout/options', '/store-api/countries']);
  availability.countries = ['ZZ'];
  await assert.rejects(addressOptions(access), { kind: 'protocol' });
});

test('checkout records an explicit decision for the displayed policy in the same cart scope', async () => {
  const policyVersion = 'a'.repeat(64);
  const terms = { policyVersion, terms: true, digitalImmediate: false };
  const accepted = { ...terms, locale: 'de-DE', recordedAt: '2026-11-12T15:00:00Z' };
  const requests = [];
  const client = createCheckoutClient({
    baseUrl: 'https://shop.example', shop: 'demo', channel: 'external', locale: 'de-DE',
    fetch: async (url, request) => {
      requests.push([url.pathname, request]);
      if (request.method === 'GET') return Response.json({ policyVersion });
      if (requests.length === 3) return new Response(null, { status: 409 });
      return Response.json(requests.length === 2 ? accepted : { ...accepted, digitalImmediate: true });
    },
  });
  const access = { cartToken: 'cart-token', customerToken: 'buyer-token' };
  assert.deepEqual(await client.legalPolicy(), { policyVersion });
  await assert.rejects(client.acceptTerms({ ...terms, terms: false }, access), TypeError);
  await assert.rejects(client.acceptTerms({ policyVersion, terms: true }, access), TypeError);
  assert.deepEqual(await client.acceptTerms(terms, access), accepted);
  await assert.rejects(client.acceptTerms(terms, access), { status: 409, outcomeUnknown: false });
  await assert.rejects(client.acceptTerms(terms, access), { kind: 'protocol', outcomeUnknown: true });
  assert.equal(requests.length, 4);
  assert.equal(requests[0][0], '/store-api/legal');
  assert.equal(requests[0][1].headers.get('sw-context-token'), null);
  for (const [path, request] of requests.slice(1)) {
    assert.equal(path, '/store-api/legal/acceptance');
    assert.equal(request.method, 'PUT');
    assert.deepEqual(JSON.parse(request.body), terms);
    assert.equal(request.headers.get('x-customer-token'), 'buyer-token');
    assert.equal(request.headers.get('sw-context-token'), 'cart-token');
  }
  for (const [, { headers }] of requests) {
    assert.equal(headers.get('x-tenant'), 'demo');
    assert.equal(headers.get('sw-sales-channel-id'), 'external');
    assert.equal(headers.get('x-commerce-locale'), 'de-DE');
    assert.equal(headers.get('authorization'), null);
  }
});

test('currency and coupons use the current cart revision and return the server quote', async () => {
  const access = { customerToken: 'buyer-token', cartToken: 'cart-token' };
  const discounted = { revision: 8, couponCodes: ['DEMO10'], price: { totalMinor: '2241' } };
  const converted = { revision: 9, price: { currency: 'USD', totalMinor: '2801' } };
  const undiscounted = { revision: 10, couponCodes: [], price: { totalMinor: '3113' } };
  const steps = [
    ['coupons', { codes: ['DEMO10'], revision: 7 }, discounted],
    ['currency', { currency: 'USD', revision: 8 }, converted],
    ['coupons', { codes: [], revision: 9 }, undiscounted],
    ['currency', { currency: 'EUR', revision: 7 }, null],
  ];
  const { cart } = createCheckoutClient({
    baseUrl: 'https://shop.example', shop: 'demo', channel: 'external', locale: 'de-DE',
    fetch: async (url, request) => {
      const [path, body, quote] = steps.shift();
      assert.equal(url.pathname, '/store-api/checkout/' + path);
      assert.equal(request.method, 'PUT');
      assert.deepEqual(JSON.parse(request.body), body);
      assert.equal(request.headers.get('x-tenant'), 'demo');
      assert.equal(request.headers.get('sw-sales-channel-id'), 'external');
      assert.equal(request.headers.get('x-commerce-locale'), 'de-DE');
      assert.equal(request.headers.get('sw-context-token'), access.cartToken);
      assert.equal(request.headers.get('x-customer-token'), access.customerToken);
      assert.equal(request.headers.get('authorization'), null);
      return quote ? Response.json(quote) : new Response(null, { status: 409 });
    },
  });
  assert.throws(() => cart.setCoupons({ codes: [''], revision: 7 }, access), TypeError);
  assert.throws(() => cart.setCoupons({ codes: ['Frühling'], revision: 7 }, access), TypeError);
  assert.throws(() => cart.setCoupons({ codes: [], revision: -1 }, access), TypeError);
  assert.throws(() => cart.setCurrency({ currency: 'usd', revision: 7 }, access), TypeError);
  assert.throws(() => cart.setCurrency({ currency: 'USD', revision: 7 }, {}), TypeError);
  assert.deepEqual(await cart.setCoupons({ codes: ['DEMO10'], revision: 7 }, access), discounted);
  assert.deepEqual(await cart.setCurrency({ currency: 'USD', revision: 8 }, access), converted);
  assert.deepEqual(await cart.setCoupons({ codes: [], revision: 9 }, access), undiscounted);
  await assert.rejects(cart.setCurrency({ currency: 'EUR', revision: 7 }, access),
    { status: 409, outcomeUnknown: false });
  assert.equal(steps.length, 0);
});

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
