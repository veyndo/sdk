import test from 'node:test';
import assert from 'node:assert/strict';
import { createHostedShop, hostedOrigin } from '@veyndo/sdk/hosted';
import { VeyndoError } from '@veyndo/sdk';

const profile = {
  name: 'Veyndo Commerce', version: 1, mode: 'api-only', shopHeader: 'x-tenant',
  documentation: 'https://www.veyndo.ai/docs/hosted-component-api.html',
  endpoints: { health: '/health', store: '/store-api', admin: '/api', mcp: '/mcp', ucp: '/.well-known/ucp' },
};

test('hosted shop shares context while keeping the merchant key out of shopper calls', async () => {
  const seen = [];
  let token = 'merchant-first';
  const shop = createHostedShop({
    shop: 'demo-shop', channel: 'external', locale: 'de-DE', currency: 'EUR',
    merchantToken: () => token,
    async fetch(url, input) {
      assert.equal(url.origin, hostedOrigin);
      seen.push([url.pathname, input.headers]);
      if (url.pathname === '/.well-known/veyndo') return Response.json(profile);
      if (url.pathname === '/mcp') {
        const { id } = JSON.parse(input.body);
        return Response.json({ jsonrpc: '2.0', id, result: { tools: [] } });
      }
      return Response.json({});
    },
  });
  assert.deepEqual(await shop.describe(), profile);
  await shop.catalog.list({ limit: 1 });
  await shop.catalog.context();
  await shop.catalog.navigation();
  await shop.checkout.options();
  await shop.account.orders.list(undefined, { customerToken: 'buyer' });
  await shop.mcp.tools();
  token = 'merchant-second';
  await shop.mcp.tools();
  assert.equal(seen[0][1].get('x-tenant'), null);
  assert.equal(seen[0][1].get('authorization'), null);
  for (const [path, headers] of seen.slice(1)) {
    assert.equal(headers.get('x-tenant'), 'demo-shop');
    assert.equal(headers.get('sw-sales-channel-id'), 'external');
    assert.equal(headers.get('x-commerce-locale'), 'de-DE');
    assert.equal(headers.get('x-commerce-currency'), 'EUR');
    if (path !== '/mcp') assert.equal(headers.get('authorization'), null);
  }
  assert.deepEqual(seen.map(([path]) => path), [
    '/.well-known/veyndo', '/store-api/product', '/store-api/context', '/store-api/navigation',
    '/store-api/checkout/options', '/store-api/account/orders', '/mcp', '/mcp',
  ]);
  assert.equal(seen[5][1].get('x-customer-token'), 'buyer');
  assert.equal(seen[6][1].get('authorization'), 'Bearer merchant-first');
  assert.equal(seen[7][1].get('authorization'), 'Bearer merchant-second');
});

test('validates shop and profile, and reports the server request ID on failure', async () => {
  assert.throws(() => createHostedShop({ shop: 'bad/shop' }), /shop must be a Veyndo shop ID/);
  const shop = createHostedShop({ shop: 'demo', baseUrl: 'http://127.0.0.1:8787',
    fetch: async url => url.pathname === '/.well-known/veyndo'
      ? Response.json({ ...profile, endpoints: { ...profile.endpoints, mcp: 'https://elsewhere.test' } })
      : new Response(null, { status: 403, headers: { 'x-request-id': 'request-123' } }),
  });
  await assert.rejects(shop.describe(), error => error instanceof VeyndoError && error.kind === 'protocol');
  await assert.rejects(shop.catalog.list(), error => error instanceof VeyndoError &&
    error.status === 403 && error.requestId === 'request-123' && error.outcomeUnknown === false);
});
