/** Negative compile controls ensure registry arguments are not widened to arbitrary JSON. */
import { createClient, VeyndoError } from '../src/index.js';
const client = createClient({ baseUrl: 'https://component.example', shop: 'example' });
void client.tool('knowledge.search', { query: 'Lampe' });
void client.tool('app.care.read', { productId: 'lamp' });
// @ts-expect-error The registry requires a string query.
void client.tool('knowledge.search', { query: 123 });
// @ts-expect-error Native operation names are closed by the registry.
void client.tool('invented.operation', {});
// @ts-expect-error checkout.complete requires the declared input contract.
void client.tool('checkout.complete', { idempotency_key: 123 });
const error = new VeyndoError('fixture');
const uncertain: boolean = error.outcomeUnknown;
void uncertain;
const external = createClient<{ 'external.search': { term: string } }>({ baseUrl: 'https://component.example' });
void external.tool('external.search', { term: 'chair' });
// @ts-expect-error An external component retains its own input contract.
void external.tool('external.search', { term: 123 });
import { createHostClient } from '../src/host.js';
const host = createHostClient({ baseUrl: 'https://host.example', appId:'marketplaces' });
void host.call('job_enqueue', { action:'sync', input:{ connectionId:'one', kind:'orders' }, requestKey:'request-1' });
void host.call('channel_product', { channelId:'one', id:'product', currency:'EUR' });
// @ts-expect-error A durable job requires an explicit stable request key.
void host.call('job_enqueue', { action:'sync', input:{} });
// @ts-expect-error Host operations are closed by the shared native contract.
void host.call('arbitrary_sql', { query:'select * from tenants' });
// @ts-expect-error Money uses exact integer minor units, not decimal strings.
void host.call('order_import', { totalMinor:'12.99' });

import { createComposition, createLayoutRegistry } from '../src/composition.js';
const composed = createComposition({ services: [{ id: 'core', client: createClient({ baseUrl: 'https://example.com' }) }], context: { shop: 'demo' }, views: [
  { id: 'products', title: 'Products', version: 1, service: 'core', operation: 'catalog.search', effect: 'read', arguments: () => ({}) },
] });
composed.discover(); composed.read({ version: 1, panels: [] }, 'x');
createLayoutRegistry([{ id: 'a', title: 'A', version: 1 }]);
