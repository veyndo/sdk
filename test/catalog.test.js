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

test('catalog navigation and context are cancellable reads in the current shop scope', async () => {
  const paths = [];
  const catalog = createCatalogClient({
    baseUrl: 'https://shop.example', shop: 'demo', channel: 'web', locale: 'de-DE',
    fetch: async (url, input) => {
      paths.push(url.pathname);
      assert.equal(input.method, 'GET');
      assert.equal(input.body, undefined);
      assert.equal(input.headers.get('x-tenant'), 'demo');
      assert.equal(input.headers.get('sw-sales-channel-id'), 'web');
      assert.equal(input.headers.get('x-commerce-locale'), 'de-DE');
      if (url.pathname === '/store-api/context') return Response.json({ locale: 'de-DE', currency: 'EUR' });
      return new Response(null, { status: 403, headers: { 'x-request-id': 'navigation-1' } });
    },
  });
  assert.deepEqual(await catalog.context(), { locale: 'de-DE', currency: 'EUR' });
  await assert.rejects(catalog.navigation(), { status: 403, requestId: 'navigation-1', outcomeUnknown: false });
  await assert.rejects(catalog.navigation({ signal: AbortSignal.abort() }), { kind: 'aborted', outcomeUnknown: false });
  assert.deepEqual(paths, ['/store-api/context', '/store-api/navigation']);
});
