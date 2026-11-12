/** Local example host. Browser sessions never receive buyer or service credentials. */
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createClient } from '@veyndo/sdk';
import { createAccountClient } from '@veyndo/sdk/account';
import { createCatalogClient } from '@veyndo/sdk/catalog';
import { createCheckoutClient } from '@veyndo/sdk/checkout';
import { checkout } from './commerce.mjs';
import { discoverGuide } from './guide.mjs';
import { a2uiLayout, generateLayout, layoutSource } from './layout.mjs';

const core = new URL(process.env.VEYNDO_URL ?? 'http://127.0.0.1:8787');
const port = Number(process.env.PORT ?? 8812);
const authority = '127.0.0.1:' + port;
const origin = 'http://' + authority;
const shop = process.env.VEYNDO_SHOP;
const productId = process.env.VEYNDO_PRODUCT ?? 'mug';
if (core.hostname !== '127.0.0.1' || core.protocol !== 'http:' || core.origin === origin ||
    !Number.isInteger(port) || port < 1024 || port > 65535 || !shop)
  throw new Error('Use distinct loopback ports and set VEYNDO_SHOP to an isolated demo shop');

const options = { baseUrl: core, shop, timeoutMs: 8000 };
const client = createClient({ ...options, mcpApps: true });
const commerce = checkout({
  account: createAccountClient(options), catalog: createCatalogClient(options), checkoutClient: createCheckoutClient(options),
}, productId);
const guide = await discoverGuide(client, productId);
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('browser.mjs', import.meta.url))],
  outdir: 'assets', splitting: true,
  bundle: true, format: 'esm', write: false, logLevel: 'silent', minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
});
const assets = new Map([
  ['/', ['text/html', await readFile(new URL('index.html', import.meta.url))]],
  ['/shop.css', ['text/css', await readFile(new URL('shop.css', import.meta.url))]],
  ...bundle.outputFiles.map(file => ['/' + basename(file.path), ['text/javascript', file.contents]]),
  ['/guide-frame', ['text/html', guide.html]],
]);
const sitePolicy = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'";
const guidePolicy = "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'";

function send(response, status, value, type = 'application/json', headers = {}) {
  response.writeHead(status, {
    'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': sitePolicy, ...headers,
  });
  response.end(type === 'application/json' ? JSON.stringify(value) : value);
}

const sessions = new Map();
function browserSession(request) {
  const key = request.headers.cookie?.match(/(?:^|; )veyndo_demo=([a-f0-9]{48})(?:;|$)/)?.[1];
  const state = sessions.get(key);
  return state?.expires > Date.now() ? state : undefined;
}

async function readBody(request) {
  if (request.headers['content-type'] !== 'application/json') throw new Error('JSON required');
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2048) throw new Error('Request too large');
  }
  const value = JSON.parse(body);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('An object is required');
  return value;
}

const actions = new Map([
  ['/layout', async (_state, { focus, renderer = 'openui' }) => {
    const layout = await generateLayout(focus, {
      key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL,
    });
    return renderer === 'a2ui-v1'
      ? { generator: layout.generator, messages: a2uiLayout(layout.focus) }
      : { generator: layout.generator, source: layoutSource(layout.focus) };
  }],
  ['/ask', async state => ({ answer: 'Here is the installed product guide for this item.',
    arguments: guide.original, definition: guide.definition, result: await guide.read(state) })],
  ['/filter', (state, body) => guide.read(state, body)],
  ['/review', commerce.review],
  ['/confirm', commerce.confirm],
  ['/status', commerce.status],
]);

createServer({ requestTimeout: 10000 }, async (request, response) => {
  if (request.headers.host !== authority) return send(response, 403, { error: 'Use the loopback host' });
  let state = browserSession(request);
  const assetPath = request.url === '/?renderer=a2ui' ? '/' : request.url;
  if (request.method === 'GET' && assets.has(assetPath)) {
    const [type, data] = assets.get(assetPath);
    const headers = request.url === '/guide-frame' ? { 'Content-Security-Policy': guidePolicy } : {};
    if (assetPath === '/' && !state) {
      for (const [key, value] of sessions) if (!value.busy && value.expires <= Date.now()) sessions.delete(key);
      if (sessions.size >= 100) return send(response, 503, { error: 'Example session capacity reached' });
      const key = randomBytes(24).toString('hex');
      sessions.set(key, { expires: Date.now() + 3600000 });
      headers['Set-Cookie'] = 'veyndo_demo=' + key + '; HttpOnly; SameSite=Strict; Path=/';
    }
    return send(response, 200, data, type, headers);
  }
  if (!state) return send(response, 401, { error: 'Open the example first' });
  try {
    if (request.method === 'GET' && request.url === '/product')
      return send(response, 200, await commerce.product());
    const action = actions.get(request.url);
    if (request.method !== 'POST' || !action) return send(response, 404, { error: 'Unknown operation' });
    if (request.headers.origin !== origin) return send(response, 403, { error: 'Only this example may call the operation' });
    if (state.busy) return send(response, 409, { error: 'Wait for the current operation' });
    state.busy = true;
    try {
      const body = await readBody(request).catch(() => null);
      if (!body) return send(response, 400, { error: 'Invalid request body' });
      if (request.url === '/layout' && body.renderer !== undefined &&
          !['openui', 'a2ui-v1'].includes(body.renderer))
        return send(response, 400, { error: 'Choose OpenUI or A2UI v1.0' });
      return send(response, 200, await action(state, body));
    } finally { state.busy = false; }
  } catch (error) {
    // Keep upstream responses, app data and buyer credentials on the server.
    console.error('Example operation failed', request.url, error.status ?? error.name);
    return send(response, 502, { error: 'The shop could not complete this step. Check the demo configuration or order status.' });
  }
}).listen(port, '127.0.0.1', () => console.log(origin));
