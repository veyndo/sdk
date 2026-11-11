import assert from 'node:assert/strict';
import test from 'node:test';
import { createCatalogClient } from '@veyndo/sdk/catalog';

test('catalog lists and reads details with one configured storefront context', async () => {
  const criteria = { limit: 2, after: 'last root', categoryId: 'lighting', search: 'lamp' };
  const page = { elements: [{ id: 'lamp' }], limit: 2, hasMore: false, nextCursor: null };
  const detail = { product: { id: 'lamp?brass' }, variantsPagination: { nextCursor: 'next', hasMore: true, limit: 1 } };
  const calls = [];
  const catalog = createCatalogClient({
    baseUrl: 'https://shop.example', shop: 'demo', channel: 'uk', locale: 'en-GB', currency: 'GBP',
    fetch: async (url, options) => {
      calls.push({ url, options });
      return Response.json(options.method === 'POST' ? page : detail);
    },
  });
  assert.deepEqual(await catalog.list(criteria), page);
  assert.deepEqual(await catalog.detail('lamp?brass', { limit: 1, after: 'last+child' }), detail);
  assert.equal(calls[0].url.pathname, '/store-api/product');
  assert.deepEqual(JSON.parse(calls[0].options.body), criteria);
  assert.equal(calls[1].options.method, 'GET');
  assert.equal(calls[1].url.pathname, '/store-api/product/lamp%3Fbrass');
  assert.equal(calls[1].url.searchParams.get('limit'), '1');
  assert.equal(calls[1].url.searchParams.get('after'), 'last+child');
  for (const { options: { headers } } of calls) {
    assert.equal(headers.get('x-tenant'), 'demo');
    assert.equal(headers.get('sw-sales-channel-id'), 'uk');
    assert.equal(headers.get('x-commerce-locale'), 'en-GB');
    assert.equal(headers.get('x-commerce-currency'), 'GBP');
  }
  for (const id of ['', '.', '..', 'a/b', 'a\\b']) assert.throws(() => catalog.detail(id), TypeError);
  assert.equal(calls.length, 2);
});

test('a failed listing reports a read failure even though its HTTP verb is POST', async () => {
  const catalog = createCatalogClient({
    baseUrl: 'https://shop.example',
    fetch: async () => new Response(null, { status: 503 }),
  });
  await assert.rejects(catalog.list(), { kind: 'http', status: 503, outcomeUnknown: false });
});
