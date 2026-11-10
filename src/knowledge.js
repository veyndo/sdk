/** Typed access to the standalone Knowledge HTTP contract. */
import { transport } from './transport.js';

export function createKnowledgeClient({ baseUrl, expectedTenant, token, timeoutMs, maxResponseBytes, fetch }) {
  if (typeof expectedTenant !== 'string' || !expectedTenant || expectedTenant !== expectedTenant.trim())
    throw new TypeError('An exact expectedTenant is required for Knowledge');
  const request = transport({ baseUrl, token, timeoutMs, maxResponseBytes, fetch });
  const headers = { 'x-expected-tenant': expectedTenant };

  function source(kind) {
    const call = (operation, body, { signal } = {}) =>
      request(`/v1/${kind}/${operation}`, { method: 'POST', body, headers, signal });
    return Object.freeze({
      read: (input, options) => call('read', input, options),
      list: (input = {}, options) => call('list', input, options),
      put: (input, options) => call('put', input, options),
      withdraw: (input, options) => call('withdraw', input, options),
      search: (input, options) => call('search', input, options),
      current: (input, options) => call('current', input, options),
      graph: (input, options) => call('graph', input, options),
    });
  }

  return Object.freeze({ documents: source('documents'), products: source('products') });
}
