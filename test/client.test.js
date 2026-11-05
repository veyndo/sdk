/** Independent wire fixtures exercise the published client without importing a Veyndo server. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createClient, VeyndoError } from '../src/index.js';

async function fixture(t, handle) {
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    await handle(req, res, body ? JSON.parse(body) : undefined);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}`;
}
const reply = (res, body, status = 200) => {
  res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body));
};

test('HTTP uses exact origin, scoped headers and JSON', async t => {
  const baseUrl = await fixture(t, (req, res, body) => {
    assert.equal(req.url, '/api/example'); assert.equal(req.headers['x-tenant'], 'shop-a');
    assert.equal(req.headers.authorization, 'Bearer synthetic-fixture');
    assert.deepEqual(body, { language: 'es-ES' }); reply(res, { revision: 7 });
  });
  const client = createClient({ baseUrl, shop: 'shop-a', token: () => 'synthetic-fixture' });
  assert.deepEqual(await client.request('/api/example', { method: 'POST', body: { language: 'es-ES' } }), { revision: 7 });
});

test('MCP negotiation and tools use the same endpoint and correlation', async t => {
  const methods = [];
  const baseUrl = await fixture(t, (req, res, body) => {
    assert.equal(req.url, '/mcp'); methods.push(body.method);
    if (body.method === 'initialize') return reply(res, { jsonrpc: '2.0', id: body.id,
      result: { protocolVersion: '2025-11-25', capabilities: { tools: {} } } });
    assert.equal(req.headers['mcp-protocol-version'], '2025-11-25');
    if (body.method === 'tools/list') return reply(res, { jsonrpc: '2.0', id: body.id, result: { tools: [{ name: 'knowledge.search' }] } });
    assert.deepEqual(body.params, { name: 'knowledge.search', arguments: { query: 'Lampe' } });
    reply(res, { jsonrpc: '2.0', id: body.id, result: { isError: false, structuredContent: { hits: [{ id: 'lamp' }] } } });
  });
  const client = createClient({ baseUrl }); await client.initialize();
  assert.equal((await client.tools()).tools[0].name, 'knowledge.search');
  assert.deepEqual(await client.tool('knowledge.search', { query: 'Lampe' }), { hits: [{ id: 'lamp' }] });
  assert.deepEqual(methods, ['initialize', 'tools/list', 'tools/call']);
});

test('domain, protocol and HTTP errors stay distinguishable', async t => {
  const baseUrl = await fixture(t, (req, res, body) => {
    if (req.url === '/denied') return reply(res, {}, 403);
    if (body.params.name === 'protocol') return reply(res, { jsonrpc: '2.0', id: body.id, error: { code: -32602, message: 'Invalid arguments' } });
    if (body.params.name === 'internal') return reply(res, { jsonrpc: '2.0', id: body.id, error: { code: -32603, message: 'Internal failure after dispatch' } });
    reply(res, { jsonrpc: '2.0', id: body.id, result: { isError: true,
      content: [{ type: 'text', text: 'Revision changed; reload before applying' }] } });
  });
  const client = createClient({ baseUrl });
  await assert.rejects(client.request('/denied'), e => e instanceof VeyndoError && e.kind === 'http' && e.status === 403);
  await assert.rejects(client.tool('protocol'), e => e.kind === 'rpc' && e.code === -32602 && !e.outcomeUnknown);
  await assert.rejects(client.tool('internal'), e => e.kind === 'rpc' && e.outcomeUnknown);
  await assert.rejects(client.tool('domain'), e => e.kind === 'tool' && e.outcomeUnknown && e.message.includes('Revision changed'));
});

test('rejects foreign URLs, credentials, redirects and authority overrides', async t => {
  for (const baseUrl of ['http://example.com', 'https://user:pass@example.com', 'https://example.com?q=a', 'https://example.com/#x'])
    assert.throws(() => createClient({ baseUrl }), /baseUrl/);
  let foreign = 0;
  const foreignUrl = await fixture(t, (req, res) => { foreign++; reply(res, {}); });
  const baseUrl = await fixture(t, (req, res) => { res.writeHead(307, { location: foreignUrl }); res.end(); });
  const client = createClient({ baseUrl, token: 'synthetic-private' });
  for (const path of [foreignUrl, '//example.com', '/a/../b', '/%2e%2e/b'])
    await assert.rejects(client.request(path), /path/);
  await assert.rejects(client.request('/ok', { headers: { authorization: 'Bearer other' } }), /header/);
  await assert.rejects(client.request('/redirect'), e => e.kind === 'network');
  assert.equal(foreign, 0);
});

test('a lost write response is ambiguous and is never retried', async t => {
  let received = 0;
  const baseUrl = await fixture(t, (req, res) => { received++; req.socket.destroy(); });
  const client = createClient({ baseUrl });
  await assert.rejects(client.tool('checkout.complete', { idempotency_key: 'fixture' }),
    e => e.kind === 'network' && e.outcomeUnknown === true);
  assert.equal(received, 1);
});

test('timeout and caller cancellation abort a request', async t => {
  const baseUrl = await fixture(t, () => {});
  const client = createClient({ baseUrl, timeoutMs: 30 });
  await assert.rejects(client.request('/wait'), e => e.kind === 'timeout' && !e.outcomeUnknown);
  const abort = new AbortController(); abort.abort();
  await assert.rejects(client.request('/wait', { signal: abort.signal }), e => e.kind === 'aborted');
});

test('rejects wrong MCP IDs, malformed envelopes and oversized responses', async t => {
  const baseUrl = await fixture(t, (req, res, body) => {
    if (req.url === '/large') return reply(res, { data: 'x'.repeat(600) });
    if (body.params.name === 'wrong') return reply(res, { jsonrpc: '2.0', id: 'other', result: {} });
    reply(res, { id: body.id, result: {} });
  });
  const client = createClient({ baseUrl, maxResponseBytes: 256 });
  await assert.rejects(client.tool('wrong'), e => e.kind === 'protocol');
  await assert.rejects(client.tool('malformed'), e => e.kind === 'protocol');
  await assert.rejects(client.request('/large'), e => e.kind === 'protocol');
});

test('component endpoints need no Core route or implementation', async t => {
  const baseUrl = await fixture(t, (req, res, body) => {
    assert.equal(req.url, '/knowledge/mcp');
    reply(res, { jsonrpc: '2.0', id: body.id, result: { structuredContent: { source: 'external-catalog' } } });
  });
  const client = createClient({ baseUrl, mcpPath: '/knowledge/mcp' });
  assert.deepEqual(await client.tool('knowledge.search', { query: 'chair' }), { source: 'external-catalog' });
});
