import assert from 'node:assert/strict';
import test from 'node:test';
import { createKnowledgeClient } from '@veyndo/sdk/knowledge';

test('Knowledge pins an expected tenant and keeps source kinds and pagination distinct', async () => {
  const calls = [];
  let token = 'first';
  const knowledge = createKnowledgeClient({
    baseUrl: 'https://knowledge.example', expectedTenant: 'shop-a', token: () => token,
    fetch: async (url, request) => {
      calls.push([url.pathname, request.method, request.headers.get('x-expected-tenant'),
        request.headers.get('authorization'), request.headers.get('x-tenant'), JSON.parse(request.body)]);
      return Response.json({ sources: [], nextCursor: calls.length === 1 ? 'sku-42' : null });
    },
  });
  const first = await knowledge.products.list({ limit: 1 });
  token = 'second';
  assert.equal((await knowledge.products.list({ after: first.nextCursor })).nextCursor, null);
  await knowledge.documents.list();
  assert.deepEqual(calls, [
    ['/v1/products/list', 'POST', 'shop-a', 'Bearer first', null, { limit: 1 }],
    ['/v1/products/list', 'POST', 'shop-a', 'Bearer second', null, { after: 'sku-42' }],
    ['/v1/documents/list', 'POST', 'shop-a', 'Bearer second', null, {}],
  ]);
  assert.throws(() => createKnowledgeClient({ baseUrl: 'https://knowledge.example' }), /expectedTenant/);
});

test('Knowledge preserves conflict and ambiguous write errors without repeating a mutation', async () => {
  const statuses = [409, 503];
  const knowledge = createKnowledgeClient({
    baseUrl: 'https://knowledge.example', expectedTenant: 'shop-a', token: 'fixture',
    fetch: async () => Response.json({}, { status: statuses.shift() }),
  });
  await assert.rejects(knowledge.documents.withdraw({ id: 'policy', revision: 1 }),
    { kind: 'http', status: 409, outcomeUnknown: false });
  await assert.rejects(knowledge.documents.withdraw({ id: 'policy', revision: 2 }),
    { kind: 'http', status: 503, outcomeUnknown: true });
  assert.deepEqual(statuses, []);
});
