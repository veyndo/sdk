/** Use the same Core Store API and independent Checkout relay as the native shop. */
import { randomUUID } from 'node:crypto';

const address = {
  name: 'Example Buyer', firstName: 'Example', lastName: 'Buyer',
  street: 'Example Street 2', city: 'Berlin', postalCode: '10115', country: 'DE',
};

export function checkout({ account, catalog, checkoutClient }, productId) {
  async function product() {
    const detail = await catalog.detail(productId, { limit: 50 });
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

  function receipt(state, order) {
    if (order.currency !== state.review.summary.currency || order.totalMinor !== state.review.summary.totalMinor)
      throw new Error('The receipt does not match the reviewed purchase');
    state.receipt = { kind: 'receipt', orderNumber: order.orderNumber, item: state.review.summary.item,
      totalMinor: String(order.totalMinor), currency: order.currency };
    return state.receipt;
  }

  async function recover(state) {
    try {
      return receipt(state, await checkoutClient.receipt(state.review.receiptLookup, { customerToken: state.customerToken }));
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
      if (!state.customerToken) {
        const email = 'sdk-demo-' + randomUUID() + '@example.test';
        const buyer = await account.request('/store-api/account/register', {
          method: 'POST',
          body: { email, name: address.name, password: randomUUID(), billingAddress: address, shippingAddress: address },
        });
        if (!buyer.customerToken) throw new Error('The shop did not provide a buyer session');
        state.customerToken = buyer.customerToken;
      }
      const buyer = { customerToken: state.customerToken };
      const initial = await checkoutClient.cart.create({ session: randomUUID() }, buyer);
      const access = { ...buyer, cartToken: initial.token };
      const items = [{ id: item.id, quantity: 1 }];
      const preview = await checkoutClient.cart.preview({ items, revision: initial.revision }, access);
      const cart = await checkoutClient.cart.apply({ items, revision: preview.revision, review: preview.review }, access);
      if (cart.checkoutService?.transport !== 'same-origin' ||
          cart.checkout.paymentMethodId !== 'demo-card' || cart.price.currency !== 'EUR' ||
          !cart.locale || typeof cart.price.totalMinor !== 'string')
        throw new Error('The shop must use independent Checkout with the demo card and EUR');
      const prepared = await checkoutClient.prepare(cart, { requestKey: randomUUID(), ...buyer });
      const summary = { kind: 'quote', item, reviewKey: randomUUID(), currency: cart.price.currency,
        totalMinor: prepared.confirmation.totalMinor, shipping: cart.shippingCosts.totalPrice,
        delivery: cart.deliveries[0]?.deliveryDate, country: prepared.confirmation.country };
      state.review = {
        receiptLookup: prepared.receiptLookup,
        cartToken: cart.token,
        summary,
        confirmation: prepared.confirmation,
      };
      return summary;
    },
    async confirm(state, { reviewKey }) {
      if (state.receipt || state.uncertain) return status(state);
      if (!state.review || reviewKey !== state.review.summary.reviewKey)
        return { kind: 'review-again' };
      try {
        return receipt(state, await checkoutClient.confirm({ ...state.review.confirmation, confirmed: true }, {
          customerToken: state.customerToken, cartToken: state.review.cartToken,
        }));
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
