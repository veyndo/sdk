/** Read the signed-in buyer's order history through the Store API. */
import { transport, VeyndoError } from './transport.js';

const path = '/store-api/account/orders';

function idSegment(id, resource) {
  if (typeof id !== 'string' || !id.trim() || /[/\\]/.test(id) || id === '.' || id === '..') {
    throw new TypeError(`A ${resource} ID is required and must be a single path segment`);
  }
  return encodeURIComponent(id);
}

export function createAccountClient({ baseUrl, shop, credentials, timeoutMs, maxResponseBytes, fetch }) {
  const request = transport({ baseUrl, shop, credentials, timeoutMs, maxResponseBytes, fetch });

  function get(endpoint, { signal, customerToken } = {}, responseType) {
    const headers = customerToken ? { 'x-customer-token': customerToken } : undefined;
    return request(endpoint, { headers, signal }, responseType);
  }

  return Object.freeze({
    orders: Object.freeze({
      list({ after } = {}, buyer) {
        const query = after === undefined ? '' : `?${new URLSearchParams({ after })}`;
        return get(path + query, buyer);
      },
      async detail(id, buyer) {
        const order = await get(`${path}/${idSegment(id, 'order')}`, buyer);
        if (order?.id !== id) {
          throw new VeyndoError('The order response does not match the requested order', { kind: 'protocol' });
        }
        return order;
      },
      async receiptPdf(orderId, receiptId, buyer) {
        const order = idSegment(orderId, 'order');
        const receipt = idSegment(receiptId, 'receipt');
        return get(`${path}/${order}/receipts/${receipt}/pdf`, buyer, 'pdf');
      },
    }),
  });
}
