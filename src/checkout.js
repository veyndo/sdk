/** Use the Store API cart and the buyer's independent Checkout relay. */
import { transport, VeyndoError } from './transport.js';

function headers({ customerToken, cartToken } = {}) {
  return {
    ...(customerToken ? { 'x-customer-token': customerToken } : {}),
    ...(cartToken ? { 'sw-context-token': cartToken } : {}),
  };
}

function cartHeaders(access) {
  if (typeof access?.cartToken !== 'string' || !access.cartToken.trim()) {
    throw new TypeError('The current cart token is required');
  }
  return headers(access);
}

function reviewedItems(input) {
  if (!Number.isSafeInteger(input?.revision) || input.revision < 0 || !Array.isArray(input.items)) {
    throw new TypeError('Cart review requires items and a current cart revision');
  }
  return { items: input.items, revision: input.revision };
}

function checkedReceipt(receipt, sessionId, outcomeUnknown) {
  if (receipt?.sessionId !== sessionId || typeof receipt.orderId !== 'string' ||
      !receipt.orderId || typeof receipt.orderNumber !== 'string' || !receipt.orderNumber ||
      typeof receipt.currency !== 'string' || !/^[A-Z]{3}$/.test(receipt.currency) ||
      typeof receipt.totalMinor !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(receipt.totalMinor)) {
    throw new VeyndoError('Checkout returned an invalid receipt for this session', { kind: 'protocol', outcomeUnknown });
  }
  return receipt;
}

export function createCheckoutClient(options) {
  const { baseUrl, shop, credentials, timeoutMs, maxResponseBytes, fetch, channel, locale, currency } = options;
  const settings = { baseUrl, shop, credentials, timeoutMs, maxResponseBytes, fetch };
  const write = transport(settings);
  const read = transport(settings, { readOnly: true });
  const scope = new Headers();
  for (const [key, value] of [
    ['sw-sales-channel-id', channel],
    ['x-commerce-locale', locale],
    ['x-commerce-currency', currency],
  ]) {
    if (value !== undefined) scope.set(key, value);
  }
  const scopeHeaders = Object.fromEntries(scope);
  const scopedHeaders = buyerHeaders => ({ ...scopeHeaders, ...buyerHeaders });
  const cart = '/store-api/checkout/cart';

  return Object.freeze({
    cart: Object.freeze({
      create(input = {}, access = {}) {
        return write(cart, {
          method: 'POST', body: input, headers: scopedHeaders(headers(access)), signal: access.signal,
        });
      },
      read(access) {
        return read(cart, { headers: scopedHeaders(cartHeaders(access)), signal: access.signal });
      },
      add(input, access) {
        return write(`${cart}/line-item`, {
          method: 'POST', body: input, headers: scopedHeaders(cartHeaders(access)), signal: access.signal,
        });
      },
      preview(input, access) {
        return read(`${cart}/preview`, {
          method: 'POST', body: reviewedItems(input), headers: scopedHeaders(cartHeaders(access)), signal: access.signal,
        });
      },
      apply(input, access) {
        const body = reviewedItems(input);
        if (typeof input.review !== 'string' || !/^[a-f0-9]{64}$/.test(input.review)) {
          throw new TypeError('Apply requires the review returned by the cart preview');
        }
        return write(cart, {
          method: 'PUT', body: { ...body, review: input.review },
          headers: scopedHeaders(cartHeaders(access)), signal: access.signal,
        });
      },
    }),
    create(input, { signal, customerToken } = {}) {
      return write('/store-api/checkout/independent/create', {
        method: 'POST', body: input, headers: scopedHeaders(headers({ customerToken })), signal,
      });
    },
    async confirm(input, { signal, customerToken, cartToken }) {
      if (input.confirmed !== true || typeof cartToken !== 'string' || !cartToken.trim()) {
        throw new TypeError('Confirmation requires buyer approval and the current cart token');
      }
      const response = await write('/store-api/checkout/independent/confirm', {
        method: 'POST', body: input, headers: scopedHeaders(headers({ customerToken, cartToken })), signal,
      });
      const receipt = checkedReceipt(response, input.id, true);
      if (receipt.totalMinor !== input.totalMinor) {
        throw new VeyndoError('Checkout returned a different total', { kind: 'protocol', outcomeUnknown: true });
      }
      return receipt;
    },
    async receipt(input, { signal, customerToken } = {}) {
      const response = await read('/store-api/checkout/session-receipt', {
        method: 'POST', body: input, headers: scopedHeaders(headers({ customerToken })), signal,
      });
      const receipt = checkedReceipt(response, input.sessionId, false);
      if (receipt.cartId !== input.cartId || receipt.customerId !== input.customerId) {
        throw new VeyndoError('Checkout returned a receipt for a different buyer or cart', { kind: 'protocol' });
      }
      return receipt;
    },
  });
}
