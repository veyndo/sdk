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

  async function product() {
    const detail = await call('product/' + encodeURIComponent(productId) + '?limit=50');
    const parent = detail.product;
    const variants = detail.familyId === parent.id
      ? detail.variants.filter(item => item.parent_id === parent.id)
      : [];
    if (detail.familyId === parent.id && detail.variantsPagination.hasMore)
      throw new Error('Choose a product family with at most 50 entries for this example');
    const choices = (variants.length ? variants : [parent]).map(item => ({
      id: item.id, stock: item.stock,
      label: Object.values(item.options ?? {}).join(' / ') || item.name,
    }));
    return { name: parent.name, choices };
  }

  function receipt(state, order, recovered = false) {
    if (order.sessionId !== state.review.id || !order.orderId || !order.orderNumber ||
        order.currency !== state.review.summary.currency || order.totalMinor !== state.review.summary.totalMinor ||
        (recovered && (order.cartId !== state.review.cartId || order.customerId !== state.customerId)))
      throw new Error('The receipt does not match the reviewed purchase');
    state.receipt = { kind: 'receipt', orderNumber: order.orderNumber, item: state.review.summary.item,
      totalMinor: String(order.totalMinor), currency: order.currency };
    return state.receipt;
  }

  async function recover(state) {
    try {
      return receipt(state, await call('checkout/session-receipt', 'POST', {
        sessionId: state.review.id, cartId: state.review.cartId, customerId: state.customerId,
      }, state.headers), true);
    } catch (error) {
      if (error.status !== 404) throw error;
      return { kind: 'pending', item: state.review.summary.item };
    }
  }

  async function status(state) {
    if (state.receipt) return state.receipt;
    if (state.uncertain) return recover(state);
    return state.review?.summary ?? { kind: 'empty' };
  }

  return {
    product,
    status,
    async review(state, { itemId }) {
      if (state.receipt || state.uncertain) return status(state);
      state.review = null;
      const item = (await product()).choices.find(choice => choice.id === itemId && choice.stock > 0);
      if (!item) return { kind: 'unavailable' };
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
        { items: [{ referencedId: item.id, quantity: 1 }] }, headers);
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
      const summary = { kind: 'quote', item, reviewKey: randomUUID(), currency: cart.price.currency,
        totalMinor: String(cart.price.totalMinor), shipping: cart.shippingCosts.totalPrice,
        delivery: cart.deliveries[0]?.deliveryDate, country: cart.checkout.country };
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
    async confirm(state, { reviewKey }) {
      if (state.receipt || state.uncertain) return status(state);
      if (!state.review || reviewKey !== state.review.summary.reviewKey)
        return { kind: 'review-again' };
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
