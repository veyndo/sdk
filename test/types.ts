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
