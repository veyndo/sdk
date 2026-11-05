/** Actual host wire protocol, closed operations, bounded origins, version header and uncertain writes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHostClient } from '../src/host.js';

test('host exchanges use fixed path, server identity and version without retries', async () => {
  const seen = [];
  const server = createServer(async (req,res) => {
    const chunks=[]; for await(const chunk of req) chunks.push(chunk);
    seen.push({ url:req.url, headers:req.headers, body:JSON.parse(Buffer.concat(chunks)) });
    if(req.url.endsWith('order_import')) { res.writeHead(503);res.end('{}');return; }
    res.setHeader('content-type','application/json');res.end(JSON.stringify({ id:'channel', revision:7 }));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const host = createHostClient({ appId:'marketplaces',baseUrl:`http://127.0.0.1:${server.address().port}`,hostPath:'/commerce/v1/',shop:'one',token:'synthetic-fixture' });
    assert.equal((await host.call('channel',{channelId:'de'})).revision,7);
    assert.equal(seen[0].url,'/commerce/v1/channel');assert.equal(seen[0].headers['x-tenant'],'one');
    assert.equal(seen[0].headers['x-veyndo-host-version'],'1');assert.equal(seen[0].headers.authorization,'Bearer synthetic-fixture');
    assert.throws(()=>host.call('invented',{}),/Unknown/);
    assert.throws(()=>host.call('channel',[]),/Object/);
    await assert.rejects(host.call('order_import',{}),error=>error.outcomeUnknown===true && error.status===503);
    assert.equal(seen.length,2);
  } finally { await new Promise(resolve=>server.close(resolve)); }
});

test('host paths cannot redirect, traverse or inject query data', () => {
  for(const hostPath of ['//other.test/','/../secret/','/%2e%2e/','/x?query/','/x#fragment/','/x\\evil/'])
    assert.throws(()=>createHostClient({appId:'marketplaces',baseUrl:'https://example.test',hostPath}),/hostPath/);
  for(const appId of ['', '../other', 'x/y', 'Uppercase'])
    assert.throws(()=>createHostClient({appId,baseUrl:'https://example.test'}),/application ID/);
});
