import assert from 'node:assert/strict';
import test from 'node:test';
import { createAccountClient } from '@veyndo/sdk/account';
import { createCheckoutClient } from '@veyndo/sdk/checkout';

test('backend buyer sessions use explicit shop, cart and buyer context without cookies', async () => {
  const credentials = { email: 'buyer@example.test', password: 'initial' };
  const input = { ...credentials, name: 'Buyer' };
  const passwords = { oldPassword: 'initial', newPassword: 'replacement' };
  const steps = [
    ['register', input, null, null, { email: credentials.email, customerToken: 'registered' }],
    ['login', credentials, null, 'guest-cart', { token: 'buyer-cart', customerToken: 'signed-in' }],
    ['password', passwords, 'signed-in', null, { customerToken: 'new-token' }],
    ['logout', {}, 'new-token', 'buyer-cart', { loggedOut: true }],
  ];
  const { token } = createAccountClient({
    baseUrl: 'https://shop.example', shop: 'demo', channel: 'headless', locale: 'de-DE',
    credentials: 'same-origin',
    fetch: async (url, request) => {
      const [action, body, buyer, cart, result] = steps.shift();
      assert.equal(url.pathname, '/store-api/account/' + action);
      assert.equal(request.method, 'POST');
      assert.equal(request.credentials, 'omit');
      assert.equal(request.cache, 'no-store');
      assert.deepEqual(JSON.parse(request.body), body);
      for (const [header, expected] of Object.entries({
        'x-tenant': 'demo', 'sw-sales-channel-id': 'headless', 'x-commerce-locale': 'de-DE',
        'x-customer-token': buyer, 'sw-context-token': cart, authorization: null, cookie: null,
        'x-veyndo-customer-session': null, 'x-veyndo-customer-csrf': null,
      })) assert.equal(request.headers.get(header), expected);
      return Response.json(result);
    },
  });
  assert.deepEqual(await token.register(input), { email: input.email, customerToken: 'registered' });
  const cart = await token.signIn(credentials, { cartToken: 'guest-cart' });
  assert.deepEqual(cart, { token: 'buyer-cart', customerToken: 'signed-in' });
  const replacement = await token.changePassword(passwords, cart);
  assert.deepEqual(replacement, { customerToken: 'new-token' });
  assert.deepEqual(await token.signOut({ ...replacement, cartToken: cart.token }), { loggedOut: true });
  assert.equal(steps.length, 0);
});

test('backend buyer sessions reject browser markers, unrotated tokens and ambiguous responses', async () => {
  let result;
  let requests = 0;
  const { token } = createAccountClient({
    baseUrl: 'https://shop.example',
    fetch: async () => { requests++; return Response.json(result); },
  });
  const credentials = { email: 'buyer@example.test', password: 'initial' };
  const passwords = { oldPassword: 'initial', newPassword: 'replacement' };
  const protocolError = { kind: 'protocol', outcomeUnknown: true };
  await assert.rejects(token.signOut({ customerToken: 'browser-customer-session' }), TypeError);
  await assert.rejects(token.signIn(credentials, {}), TypeError);
  assert.equal(requests, 0);
  result = { email: credentials.email, customerToken: 'browser-customer-session' };
  await assert.rejects(token.register({ ...credentials, name: 'Buyer' }), protocolError);
  result = { token: 'guest-cart', customerToken: 'valid-token' };
  await assert.rejects(token.signIn(credentials, { cartToken: 'guest-cart' }), protocolError);
  await assert.rejects(token.changePassword(passwords, { customerToken: 'valid-token' }), protocolError);
  await assert.rejects(token.signOut({ customerToken: 'valid-token' }), protocolError);
  assert.equal(requests, 4);
});

test('account and checkout use the current shop cookie proof only on the same origin', async t => {
  const original = new Map(['location', 'document'].map(key =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const baseUrl = 'https://shop.example';
  const cookieName = '__Host-veyndo-customer-csrf-demo';
  const first = 'a'.repeat(64);
  const second = 'b'.repeat(64);
  const document = { cookie: `${cookieName}=${first}` };
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { origin: baseUrl } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  const requests = [];
  const fetch = async (_url, options) => {
    requests.push(['x-veyndo-customer-session', 'x-veyndo-customer-csrf', 'x-customer-token']
      .map(key => options.headers.get(key)));
    return Response.json({});
  };
  const settings = { baseUrl, shop: 'demo', credentials: 'same-origin', fetch };
  const account = createAccountClient(settings);
  await account.profile.get();
  document.cookie = `${cookieName}=${second}`;
  await createCheckoutClient(settings).options({ customerToken: 'browser-customer-session' });
  await account.profile.get({ customerToken: 'explicit-buyer' });
  await createAccountClient({ ...settings, baseUrl: 'https://elsewhere.example' }).profile.get();
  await createAccountClient({ ...settings, shop: 'other' }).profile.get();
  await createAccountClient({ ...settings, credentials: 'omit' }).profile.get();
  document.cookie += `;${cookieName}=${first}`;
  await account.profile.get();
  assert.deepEqual(requests, [
    ['1', first, null],
    ['1', second, null],
    [null, null, 'explicit-buyer'],
    ...Array.from({ length: 4 }, () => [null, null, null]),
  ]);

  document.cookie = '';
  const calls = [];
  const credentials = { email: 'buyer@example.test', password: 'synthetic' };
  const auth = createAccountClient({ ...settings, fetch: async (url, options) => {
    calls.push(url.pathname);
    assert.equal(options.headers.get('x-veyndo-customer-session'), '1');
    assert.equal(options.headers.get('x-customer-token'), null);
    const result = { customerToken: 'browser-customer-session', customerBrowserSession: true,
      customerBrowserCsrf: first };
    if (url.pathname.endsWith('/register')) return Response.json({ ...result, email: credentials.email });
    if (url.pathname.endsWith('/password')) {
      assert.equal(options.headers.get('x-veyndo-customer-csrf'), second);
      assert.deepEqual(JSON.parse(options.body), { oldPassword: 'previous-example', newPassword: 'next-example' });
      return Response.json(result);
    }
    if (url.pathname.endsWith('/logout')) {
      assert.equal(options.headers.get('x-veyndo-customer-csrf'), second);
      return Response.json({ loggedOut: true });
    }
    assert.equal(options.headers.get('sw-context-token'), 'cart-old');
    return Response.json({ ...result, token: 'cart-new' });
  } }).session;
  assert.deepEqual(await auth.register({ ...credentials, name: 'Buyer' }), { email: credentials.email });
  await assert.rejects(auth.signIn(credentials), TypeError);
  assert.deepEqual(await auth.signIn(credentials, { cartToken: 'cart-old' }), { token: 'cart-new' });
  document.cookie = `${cookieName}=${second}`;
  assert.deepEqual(await auth.changePassword({
    oldPassword: 'previous-example', newPassword: 'next-example',
  }), { changed: true });
  assert.deepEqual(await auth.signOut(), { loggedOut: true });
  await assert.rejects(createAccountClient({ ...settings, baseUrl: 'https://elsewhere.example' })
    .session.register({ ...credentials, name: 'Buyer' }), TypeError);
  const oldShop = createAccountClient({ ...settings, fetch: async () => Response.json({
    email: credentials.email, customerToken: 'legacy-bearer',
  }) });
  await assert.rejects(oldShop.session.register({ ...credentials, name: 'Buyer' }),
    { kind: 'protocol', outcomeUnknown: true });
  assert.deepEqual(calls, ['/store-api/account/register', '/store-api/account/login',
    '/store-api/account/password', '/store-api/account/logout']);
});

test('purchased files use the buyer session, locale and bounded attachment transport', async () => {
  const paths = [];
  const data = new Uint8Array([0, 1, 255]);
  const account = createAccountClient({
    baseUrl: 'https://shop.example', shop: 'demo', locale: 'it-IT', maxResponseBytes: 4,
    fetch: async (url, options) => {
      paths.push(url.pathname);
      assert.equal(options.headers.get('x-customer-token'), 'buyer');
      assert.equal(options.headers.get('x-commerce-locale'), 'it-IT');
      assert.equal(options.headers.get('x-tenant'), 'demo');
      assert.equal(options.cache, 'no-store');
      assert.equal(options.redirect, 'error');
      if (url.pathname === '/store-api/account/downloads') return Response.json({});
      assert.equal(options.headers.get('accept'), '*/*');
      if (url.pathname.endsWith('/inline')) return Response.json({});
      if (url.pathname.endsWith('/foreign')) return new Response(null, { status: 404 });
      return new Response(url.pathname.endsWith('/large') ? new Uint8Array(5) : data, {
        headers: { 'Content-Disposition': 'attachment; filename="test.zip"', 'Content-Type': 'application/zip' },
      });
    },
  });
  const buyer = { customerToken: 'buyer' };
  await account.downloads.list(buyer);
  assert.deepEqual(await account.downloads.file('order?1', 'asset+1', buyer), { bytes: data, mime: 'application/zip' });
  assert.deepEqual(paths, ['/store-api/account/downloads', '/store-api/orders/order%3F1/downloads/asset%2B1']);
  await assert.rejects(account.downloads.file('order', '..', buyer), TypeError);
  await assert.rejects(account.downloads.file('order', 'inline', buyer), { kind: 'protocol', outcomeUnknown: false });
  await assert.rejects(account.downloads.file('order', 'large', buyer), { kind: 'protocol', outcomeUnknown: false });
  await assert.rejects(account.downloads.file('order', 'foreign', buyer), { kind: 'http', status: 404 });
});

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
