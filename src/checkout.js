/** Use the buyer's Store API relay for independent Checkout and receipt lookup. */
import { transport, VeyndoError } from './transport.js';

function headers({ customerToken, cartToken } = {}) {
  return {
    ...(customerToken ? { 'x-customer-token': customerToken } : {}),
    ...(cartToken ? { 'sw-context-token': cartToken } : {}),
  };
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
  const { baseUrl, shop, credentials, timeoutMs, maxResponseBytes, fetch } = options;
  const settings = { baseUrl, shop, credentials, timeoutMs, maxResponseBytes, fetch };
  const write = transport(settings);
  const read = transport(settings, { readOnly: true });

  return Object.freeze({
    create(input, { signal, customerToken } = {}) {
      return write('/store-api/checkout/independent/create', {
        method: 'POST', body: input, headers: headers({ customerToken }), signal,
      });
    },
    async confirm(input, { signal, customerToken, cartToken }) {
      if (input.confirmed !== true || typeof cartToken !== 'string' || !cartToken.trim()) {
        throw new TypeError('Confirmation requires buyer approval and the current cart token');
      }
      const response = await write('/store-api/checkout/independent/confirm', {
        method: 'POST', body: input, headers: headers({ customerToken, cartToken }), signal,
      });
      const receipt = checkedReceipt(response, input.id, true);
      if (receipt.totalMinor !== input.totalMinor) {
        throw new VeyndoError('Checkout returned a different total', { kind: 'protocol', outcomeUnknown: true });
      }
      return receipt;
    },
    async receipt(input, { signal, customerToken } = {}) {
      const response = await read('/store-api/checkout/session-receipt', {
        method: 'POST', body: input, headers: headers({ customerToken }), signal,
      });
      const receipt = checkedReceipt(response, input.sessionId, false);
      if (receipt.cartId !== input.cartId || receipt.customerId !== input.customerId) {
        throw new VeyndoError('Checkout returned a receipt for a different buyer or cart', { kind: 'protocol' });
      }
      return receipt;
    },
  });
}
