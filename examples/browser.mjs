import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createCatalogClient } from '@veyndo/sdk/catalog';

const catalog = createCatalogClient({
  baseUrl: process.env.VEYNDO_URL ?? 'https://app.veyndo.ai',
  shop: process.env.VEYNDO_SHOP ?? 'lumen-story-lab-15-o-98aa4751fa',
  locale: process.env.VEYNDO_LOCALE ?? 'de-DE',
  timeoutMs: 8000,
});
const port = Number(process.env.PORT ?? 8813);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');

const assets = new Map(await Promise.all([
  ['/', 'browser.html', 'text/html; charset=utf-8'],
  ['/browser.css', 'browser.css', 'text/css; charset=utf-8'],
  ['/browser-catalog.mjs', 'browser-catalog.mjs', 'text/javascript; charset=utf-8'],
].map(async ([path, file, type]) => [
  path, { content: await readFile(new URL(file, import.meta.url)), type },
])));

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'");
  const host = `127.0.0.1:${server.address().port}`;
  if (request.headers.host !== host) {
    return json(response, 403, { error: 'Open the printed local address to use this example.' });
  }
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'This example only serves catalog reads.' });
  }
  if (!request.url.startsWith('/')) {
    return json(response, 400, { error: 'Use a path on the printed local address.' });
  }
  const url = new URL(`http://${host}${request.url}`);
  const asset = assets.get(url.pathname);
  if (asset) {
    response.writeHead(200, { 'Content-Type': asset.type });
    return response.end(asset.content);
  }
  if (url.pathname !== '/catalog' && url.pathname !== '/catalog/product') {
    return json(response, 404, { error: 'Page not found.' });
  }

  if (request.headers['sec-fetch-site'] === 'cross-site') {
    return json(response, 403, { error: 'Open the printed local address to use this example.' });
  }
  try {
    if (url.pathname === '/catalog') {
      const search = url.searchParams.get('search') ?? undefined;
      const after = url.searchParams.get('after') ?? undefined;
      if ([search, after].some(value => value && Buffer.byteLength(value) > 200)) {
        return json(response, 400, { error: 'Use a shorter search and the cursor returned by the catalog.' });
      }
      return json(response, 200, await catalog.list({ search, after, limit: 1 }));
    }
    const id = url.searchParams.get('id');
    if (!id || Buffer.byteLength(id) > 200 || /[/\\]/.test(id) || id === '.' || id === '..') {
      return json(response, 400, { error: 'Choose a product from the catalog.' });
    }
    return json(response, 200, await catalog.detail(id, { limit: 1 }));
  } catch (error) {
    if (error.status === 404) return json(response, 404, { error: 'This product is no longer available.' });
    return json(response, 502, { error: 'The shop catalog did not respond. Try again.' });
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Catalog example: http://127.0.0.1:${server.address().port}/`);
});
