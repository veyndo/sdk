/** Exercise actual SDK transports, independently scoped services and untrusted workspace definitions. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createClient } from '../src/index.js';
import { createComposition, createLayoutRegistry } from '../src/composition.js';
const definition = { version: 1, panels: [
  { id: 'catalog', view: 'commerce.products', version: 1, input: { query: 'chair' } },
  { id: 'sources', view: 'knowledge.sources', version: 1, input: {} },
] };
const views = [
  { id: 'commerce.products', title: 'Products', version: 1, service: 'commerce', operation: 'catalog.search', effect: 'read',
    arguments: input => ({ query: input.query }) },
  { id: 'knowledge.sources', title: 'Sources', version: 1, service: 'knowledge', operation: 'sources.list', effect: 'read',
    arguments: (_input, context) => ({ locale: context.locale }) },
];
const context = { shop: 'shop_a', environment: 'live', channel: 'web', locale: 'de-DE' };
const tool = name => ({ name, annotations: { readOnlyHint: true, destructiveHint: false } });
function fake(tools, call = async () => ({})) { return { tools: async () => ({ tools }), tool: call }; }
function host(clients = [fake([tool('catalog.search')]), fake([tool('sources.list')])]) {
  return createComposition({ services: [{ id: 'commerce', client: clients[0] }, { id: 'knowledge', client: clients[1] }], views, context });
}
test('two actual independent MCP endpoints retain separate credentials and route qualified views', async t => {
  const seen = [];
  async function endpoint(name, token, operation) {
    const server = http.createServer(async (req, res) => {
      let raw = ''; for await (const part of req) raw += part;
      const body = JSON.parse(raw); seen.push({ name, auth: req.headers.authorization, method: body.method });
      assert.equal(req.headers.authorization, `Bearer ${token}`);
      const result = body.method === 'tools/list' ? { tools: [tool(operation)] } :
        { structuredContent: { owner: name, arguments: body.params.arguments } };
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result }));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    return createClient({ baseUrl: `http://127.0.0.1:${server.address().port}`, token });
  }
  const h = host(await Promise.all([endpoint('commerce', 'commerce-only', 'catalog.search'), endpoint('knowledge', 'knowledge-only', 'sources.list')]));
  const discovered = await h.discover(); assert.equal(discovered.views.length, 2);
  assert.deepEqual(h.admit(definition), { ...definition, panels: definition.panels.map(p => ({ ...p, input: p.input })) });
  const result = await Promise.all(definition.panels.map(p => h.read(definition, p.id)));
  assert.equal(result[0].data.owner, 'commerce'); assert.equal(result[1].data.owner, 'knowledge');
  assert.deepEqual(result[1].data.arguments, { locale: 'de-DE' });
  assert.ok(!JSON.stringify(h.catalogue()).includes('only'));
  assert.equal(seen.filter(s => s.method === 'tools/call').length, 2);
});
test('model cannot register endpoints, operations, code, permissions, unknown views or incompatible versions', async () => {
  const h = host(); await h.discover();
  for (const change of [
    { url: 'https://evil.example' }, { code: 'fetch()' }, { rights: ['*'] }, { version: 2 },
    { panels: [{ id: 'x', view: 'payments.refund', version: 1 }] },
    { panels: [{ id: 'x', view: 'commerce.products', version: 99 }] },
    { panels: [definition.panels[0], definition.panels[0]] },
    { panels: [{ ...definition.panels[0], operation: 'orders.cancel' }] },
    { panels: [{ ...definition.panels[0], input: JSON.parse('{"__proto__":{"polluted":true}}') }] },
    { panels: [{ ...definition.panels[0], input: { text: 'x'.repeat(33000) } }] },
  ]) assert.equal(h.admit({ ...definition, ...change }), null);
  assert.equal({}.polluted, undefined);
});
test('unavailable service is explicit; independent healthy view remains usable', async () => {
  const h = host([fake([tool('catalog.search')]), { tools: async () => { throw new Error('private secret'); }, tool: async () => {} }]);
  const state = await h.discover(); assert.equal(state.services[1].state, 'unavailable');
  assert.equal(h.admit(definition), null);
  const one = { ...definition, panels: [definition.panels[0]] }; assert.ok(h.admit(one));
  await h.read(one, 'catalog'); assert.ok(!JSON.stringify(state).includes('secret'));
});
test('writes, missing annotations and ambiguous or partial discovery cannot auto-run', async () => {
  for (const tools of [ [{ name: 'catalog.search' }], [tool('catalog.search'), tool('catalog.search')],
    [{ ...tool('catalog.search'), annotations: { readOnlyHint: true, destructiveHint: true } }] ]) {
    const h = host([fake(tools), fake([tool('sources.list')])]); await h.discover(); assert.equal(h.admit(definition), null);
  }
  assert.throws(() => createComposition({ services: [{ id: 'commerce', client: fake([]) }], views: [{ ...views[0], effect: 'write' }], context }));
});
test('context switch aborts running reads and discards late replies even if transport ignores abort', async () => {
  let release; let signal;
  const h = host([fake([tool('catalog.search')], async (_name, _args, options) => { signal = options.signal; return new Promise(r => { release = r; }); }), fake([tool('sources.list')])]);
  await h.discover(); const pending = h.read(definition, 'catalog');
  h.setContext({ ...context, locale: 'es-ES' }); assert.equal(signal.aborted, true);
  release({ old: true }); await assert.rejects(pending, { code: 'stale_context' });
  assert.equal(h.catalogue().views.length, 0);
  await h.discover(); assert.equal(h.catalogue().views.length, 2);
  assert.throws(() => h.setContext({ ...context, shop: 'victim' }), { code: 'new_scope_requires_new_composition' });
});
test('revocation refresh removes views; service denial and unknown outcomes propagate without retries', async () => {
  let allowed = true; let calls = 0;
  const c = { tools: async () => ({ tools: allowed ? [tool('catalog.search')] : [] }), tool: async () => { calls++; throw Object.assign(new Error('denied'), { outcomeUnknown: true }); } };
  const h = host([c, fake([tool('sources.list')])]); await h.discover();
  await assert.rejects(h.read(definition, 'catalog'), { outcomeUnknown: true }); assert.equal(calls, 1);
  allowed = false; await h.discover(); await assert.rejects(h.read(definition, 'catalog'), { code: 'unavailable_view' }); assert.equal(calls, 1);
});
test('late discovery cannot repopulate another context or overwrite newer discovery', async () => {
  let release; let delayed = true;
  const c = { tools: async () => delayed ? new Promise(r => { release = r; }) : { tools: [] }, tool: async () => ({}) };
  const h = host([c, fake([tool('sources.list')])]);
  const old = h.discover(); delayed = false; await h.discover(); release({ tools: [tool('catalog.search')] });
  await assert.rejects(old, { code: 'stale_context' }); assert.equal(h.catalogue().views.length, 1);
  h.dispose(); assert.throws(() => h.admit(definition), { code: 'disposed' });
});
test('bounded layout registry is independent of React, APIs, model providers and the full product', () => {
  const r = createLayoutRegistry([{ id: 'orders.directory', version: 1, title: 'Orders' }]);
  const source = { version: 1, panels: [{ id: 'orders', view: 'orders.directory', version: 1 }] };
  assert.ok(r.admit(source)); r.catalogue()[0].id = 'changed'; assert.ok(r.admit(source));
  assert.equal(r.admit({ version: 1, panels: Array.from({ length: 13 }, (_, i) => ({ id: `p${i}`, view: 'orders.directory', version: 1 })) }), null);
  assert.throws(() => createLayoutRegistry([{ id: 'x', version: 1, title: 'X' }, { id: 'x', version: 1, title: 'X' }]));
});
