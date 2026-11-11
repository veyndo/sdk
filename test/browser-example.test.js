import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import test from 'node:test';

test('browser example uses the configured public catalog and serves only reads', { timeout: 10000 }, async t => {
  const calls = [];
  const upstream = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    calls.push({
      path: request.url, shop: request.headers['x-tenant'],
      locale: request.headers['x-commerce-locale'], token: request.headers.authorization,
      body: chunks.length ? JSON.parse(Buffer.concat(chunks)) : undefined,
    });
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(request.method === 'POST'
      ? { elements: [{ id: 'lamp' }], nextCursor: 'next' }
      : { product: { id: 'lamp', price: 24.9, currency: 'EUR', stock: 3 } }));
  });
  upstream.listen(0, '127.0.0.1');
  t.after(() => upstream.close());
  await once(upstream, 'listening');

  const host = spawn(process.execPath, ['examples/browser.mjs'], {
    env: {
      ...process.env, PORT: '0', VEYNDO_URL: `http://127.0.0.1:${upstream.address().port}`,
      VEYNDO_SHOP: 'example-shop', VEYNDO_LOCALE: 'de-DE',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const lines = createInterface({ input: host.stdout });
  t.after(() => { lines.close(); host.kill(); });
  const [line] = await once(lines, 'line', { signal: AbortSignal.timeout(5000) });
  const origin = line.split(' ').at(-1);
  const send = (path, options) => fetch(new URL(path, origin), options);

  const page = await send('/');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /browser-catalog\.mjs/);
  assert.equal((await send('/catalog', { method: 'POST' })).status, 405);
  assert.equal((await send('/catalog', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await send('/catalog/product')).status, 400);
  assert.equal(calls.length, 0);

  const listing = await send('/catalog?search=lamp&after=prior', { headers: { Authorization: 'Bearer fixture' } });
  assert.equal((await listing.json()).nextCursor, 'next');
  assert.deepEqual(calls[0], {
    path: '/store-api/product', shop: 'example-shop', locale: 'de-DE', token: undefined,
    body: { search: 'lamp', after: 'prior', limit: 1 },
  });
  const detail = await send('/catalog/product?id=lamp');
  assert.equal((await detail.json()).product.price, 24.9);
  assert.equal(calls[1].path, '/store-api/product/lamp?limit=1');
});
