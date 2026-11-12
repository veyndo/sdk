/** Access the signed-in buyer's profile, addresses and orders through the Store API. */
import { transport, VeyndoError } from './transport.js';

const path = '/store-api/account/orders';
const addresses = '/store-api/account/addresses';
const profile = '/store-api/account/profile';

function idSegment(id, resource) {
  if (typeof id !== 'string' || !id.trim() || /[/\\]/.test(id) || id === '.' || id === '..') {
    throw new TypeError(`A ${resource} ID is required and must be a single path segment`);
  }
  return encodeURIComponent(id);
}

export function createAccountClient({ baseUrl, shop, locale, credentials, timeoutMs, maxResponseBytes, fetch }) {
  const request = transport({ baseUrl, shop, credentials, timeoutMs, maxResponseBytes, fetch },
    { responseLimit: 20 * 1024 * 1024 });

  function call(endpoint, { signal, customerToken } = {}, options, responseType) {
    const headers = new Headers();
    if (customerToken) headers.set('x-customer-token', customerToken);
    if (locale) headers.set('x-commerce-locale', locale);
    return request(endpoint, { ...options, headers, signal }, responseType);
  }

  return Object.freeze({
    downloads: Object.freeze({
      list(buyer) {
        return call('/store-api/account/downloads', buyer);
      },
      async file(orderId, assetId, buyer) {
        const order = idSegment(orderId, 'order');
        const asset = idSegment(assetId, 'asset');
        return call(`/store-api/orders/${order}/downloads/${asset}`, buyer, undefined, 'file');
      },
    }),
    profile: Object.freeze({
      get(buyer) {
        return call(profile, buyer);
      },
      save(contact, buyer) {
        return call(profile, buyer, { method: 'PUT', body: { ...contact, address: null } });
      },
    }),
    addresses: Object.freeze({
      list(buyer) {
        return call(addresses, buyer);
      },
      create(input, buyer) {
        return call(addresses, buyer, { method: 'POST', body: input });
      },
      async update(id, input, buyer) {
        return call(`${addresses}/${idSegment(id, 'address')}`, buyer, { method: 'PUT', body: input });
      },
      async remove(id, input, buyer) {
        return call(`${addresses}/${idSegment(id, 'address')}`, buyer, { method: 'DELETE', body: input });
      },
    }),
    orders: Object.freeze({
      list({ after } = {}, buyer) {
        const query = after === undefined ? '' : `?${new URLSearchParams({ after })}`;
        return call(path + query, buyer);
      },
      async detail(id, buyer) {
        const order = await call(`${path}/${idSegment(id, 'order')}`, buyer);
        if (order?.id !== id) {
          throw new VeyndoError('The order response does not match the requested order', { kind: 'protocol' });
        }
        return order;
      },
      async receiptPdf(orderId, receiptId, buyer) {
        const order = idSegment(orderId, 'order');
        const receipt = idSegment(receiptId, 'receipt');
        return call(`${path}/${order}/receipts/${receipt}/pdf`, buyer, undefined, 'pdf');
      },
    }),
  });
}
