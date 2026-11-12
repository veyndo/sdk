/** Read the public Store API catalog with the same scope as the storefront. */
import { transport } from './transport.js';

export function createCatalogClient(options) {
  const request = transport(options, { readOnly: true });
  const headers = new Headers();
  for (const [key, value] of [
    ['sw-sales-channel-id', options.channel],
    ['x-commerce-locale', options.locale],
    ['x-commerce-currency', options.currency],
  ]) {
    if (value !== undefined) headers.set(key, value);
  }

  return Object.freeze({
    context({ signal } = {}) {
      return request('/store-api/context', { headers, signal });
    },
    navigation({ signal } = {}) {
      return request('/store-api/navigation', { headers, signal });
    },
    list(criteria = {}, { signal } = {}) {
      return request('/store-api/product', { method: 'POST', body: criteria, headers, signal });
    },
    detail(id, { after, limit } = {}, { signal } = {}) {
      if (typeof id !== 'string' || !id.trim() || /[/\\]/.test(id) || id === '.' || id === '..') {
        throw new TypeError('A product ID is required and must be a single path segment');
      }
      const query = new URLSearchParams();
      if (after !== undefined) query.set('after', after);
      if (limit !== undefined) query.set('limit', String(limit));
      return request(`/store-api/product/${encodeURIComponent(id)}${query.size ? `?${query}` : ''}`, { headers, signal });
    },
  });
}
