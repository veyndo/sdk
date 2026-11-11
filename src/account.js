/** Read the signed-in buyer's order history through the Store API. */
import { transport, VeyndoError } from './transport.js';

const path = '/store-api/account/orders';

export function createAccountClient({ baseUrl, shop, credentials, timeoutMs, maxResponseBytes, fetch }) {
  const request = transport({ baseUrl, shop, credentials, timeoutMs, maxResponseBytes, fetch });

  function get(endpoint, { signal, customerToken } = {}) {
    const headers = customerToken ? { 'x-customer-token': customerToken } : undefined;
    return request(endpoint, { headers, signal });
  }

  return Object.freeze({
    orders: Object.freeze({
      list({ after } = {}, buyer) {
        const query = after === undefined ? '' : `?${new URLSearchParams({ after })}`;
        return get(path + query, buyer);
      },
      async detail(id, buyer) {
        if (typeof id !== 'string' || !id.trim() || /[/\\]/.test(id) || id === '.' || id === '..') {
          throw new TypeError('An order ID is required and must be a single path segment');
        }
        const order = await get(`${path}/${encodeURIComponent(id)}`, buyer);
        if (order?.id !== id) {
          throw new VeyndoError('The order response does not match the requested order', { kind: 'protocol' });
        }
        return order;
      },
    }),
  });
}
