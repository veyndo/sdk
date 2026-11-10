/** Use the same Core Store API and independent Checkout relay as the native shop. */
import { randomUUID } from 'node:crypto';

const address = {
  name: 'Example Buyer', firstName: 'Example', lastName: 'Buyer',
  street: 'Example Street 2', city: 'Berlin', postalCode: '10115', country: 'DE',
};

export function checkout(client, productId) {
  function call(path, method = 'GET', body, headers) {
    return client.request('/store-api/' + path, { method, body, headers });
  }

  function receipt(state, order) {
    if (order.cartId !== state.review.cartId || !order.orderId || !order.orderNumber)
      throw new Error('The receipt does not match the original cart');
    state.receipt = { kind: 'receipt', orderNumber: order.orderNumber,
      totalMinor: String(order.totalMinor), currency: order.currency };
    return state.receipt;
  }

  async function recover(state) {
    try {
      return receipt(state, await call('checkout/session-receipt', 'POST', {
        sessionId: state.review.id, cartId: state.review.cartId, customerId: state.customerId,
      }, state.headers));
    } catch (error) {
      if (error.status !== 404) throw error;
      return { kind: 'pending' };
    }
  }

  async function status(state) {
    if (state.receipt) return state.receipt;
    if (state.uncertain) return recover(state);
    return state.review?.summary ?? { kind: 'empty' };
  }

  return {
    async product() {
      const { product } = await call('product/' + encodeURIComponent(productId));
      return { id: product.id, name: product.name, stock: product.stock };
    },
    status,
    async review(state) {
      if (state.review) return status(state);
      if (!state.headers) {
        const email = 'sdk-demo-' + randomUUID() + '@example.test';
        const account = await call('account/register', 'POST', {
          email, name: address.name, password: randomUUID(), billingAddress: address,
          shippingAddress: address,
        });
        if (!account.customerToken) throw new Error('The shop did not provide a buyer session');
        state.headers = { 'x-customer-token': account.customerToken };
      }
      const headers = state.headers;
      if (!state.customerId) {
        state.customerId = (await call('account/profile', 'GET', undefined, headers)).id;
        if (!state.customerId) throw new Error('The shop did not provide a buyer identity');
      }
      const initial = await call('checkout/cart', 'POST', { session: randomUUID() }, headers);
      headers['sw-context-token'] = initial.token;
      const cart = await call('checkout/cart/line-item', 'POST',
        { items: [{ referencedId: productId, quantity: 1 }] }, headers);
      if (cart.checkoutService?.transport !== 'same-origin' ||
          cart.checkout.paymentMethodId !== 'demo-card' || cart.price.currency !== 'EUR')
        throw new Error('The shop must use independent Checkout with the demo card and EUR');
      const session = await call('checkout/independent/create', 'POST', {
        requestKey: randomUUID(), expiresIn: 3600,
        context: {
          cart: { backend: 'native', id: cart.id, revision: cart.revision },
          salesChannel: 'default', environment: 'live', locale: cart.locale,
          currency: cart.price.currency, country: cart.checkout.country,
        },
      }, headers);
      const summary = { kind: 'quote', currency: cart.price.currency,
        totalMinor: String(cart.price.totalMinor) };
      state.review = {
        id: session.id, cartId: cart.id, summary,
        confirmation: {
          id: session.id, revision: session.revision, confirmed: true,
          totalMinor: cart.price.totalMinor, country: cart.checkout.country,
          paymentMethod: 'demo-card', legalPolicyVersion: cart.checkoutService.legalPolicyVersion,
        },
      };
      return summary;
    },
    async confirm(state) {
      if (!state.review || state.receipt || state.uncertain) return status(state);
      try {
        return receipt(state, await call('checkout/independent/confirm', 'POST',
          state.review.confirmation, state.headers));
      } catch (error) {
        if (error.status === 409) {
          state.review = null;
          return { kind: 'review-again' };
        }
        // After dispatch, an unknown outcome can only be checked by the original receipt lookup.
        if (error.outcomeUnknown || !error.status) {
          state.uncertain = true;
          return recover(state);
        }
        throw error;
      }
    },
  };
}
