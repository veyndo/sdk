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

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const requestKeyPattern = /^[A-Za-z0-9_.:-]{8,128}$/;

function paymentPath(attemptId) {
  if (typeof attemptId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(attemptId)) {
    throw new TypeError('Use the payment attempt ID from the checkout receipt');
  }
  return `/store-api/payments/${attemptId}`;
}

function validApprovalUrl(value) {
  if (value === null) return true;
  const url = typeof value === 'string' ? URL.parse(value) : null;
  return url?.protocol === 'https:' && !url.username && !url.password;
}

function validMinorAmount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validCurrency(value) {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

function paymentInstructions(result) {
  const { status, instructions } = result ?? {};
  if (status === 'unsupported' && instructions === null) return { status, instructions };
  const { amountMinor, currency, currencyScale, simulated } = result ?? {};
  if (validMinorAmount(amountMinor) && validCurrency(currency) && validMinorAmount(currencyScale) &&
      typeof simulated === 'boolean') {
    const amount = { amountMinor, currency, currencyScale, simulated };
    if (status === 'pending' && instructions === null) return { status, instructions, ...amount };
    if (status === 'available' && instructions?.kind === 'bank_transfer') {
      const { kind, paymentReference, iban, bic, bankName, accountHolderName } = instructions;
      if ([paymentReference, iban, bic, bankName, accountHolderName].every(nonEmpty)) {
        return { status, instructions: { kind, paymentReference, iban, bic, bankName, accountHolderName }, ...amount };
      }
    }
  }
  throw new VeyndoError('Checkout returned invalid payment instructions', { kind: 'protocol' });
}

function geographyName(names, locale, mainLocale) {
  if (!names || typeof names !== 'object') {
    throw new VeyndoError('Checkout returned an invalid country or region name', { kind: 'protocol' });
  }
  const preferred = [locale, locale.split('-')[0], mainLocale, mainLocale.split('-')[0], 'en'];
  const key = preferred.find(candidate => Object.hasOwn(names, candidate) && nonEmpty(names[candidate]));
  return key === undefined ? Object.values(names).find(nonEmpty) ?? '' : names[key];
}

function validPreparedSession(session, context) {
  const result = session?.context;
  return nonEmpty(session?.id) && Number.isSafeInteger(session.revision) &&
    session.revision >= 0 && session.state === 'draft' && session.commerceValidated === false &&
    nonEmpty(session.expiresAt) && result?.cart?.id === context.cart.id &&
    result.cart.backend === context.cart.backend && result.cart.revision === context.cart.revision &&
    ['salesChannel', 'environment', 'locale', 'currency', 'country'].every(key => result[key] === context[key]);
}

export function createCheckoutClient(options) {
  const { baseUrl, shop, credentials, timeoutMs, maxResponseBytes, fetch, channel, locale, currency } = options;
  const settings = { baseUrl, shop, credentials, timeoutMs, maxResponseBytes, fetch };
  const write = transport(settings, { buyerSession: true });
  const read = transport(settings, { readOnly: true, buyerSession: true });
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

  function checkoutOptions(access = {}) {
    const buyerHeaders = access.cartToken === undefined ? headers(access) : cartHeaders(access);
    return read('/store-api/checkout/options', { headers: scopedHeaders(buyerHeaders), signal: access.signal });
  }

  async function addressOptions(access = {}) {
    const [available, catalogue] = await Promise.all([
      checkoutOptions(access),
      read('/store-api/countries', { headers: scopeHeaders, signal: access.signal }),
    ]);
    if (!Array.isArray(available?.countries) || !Array.isArray(catalogue?.countries) ||
        !nonEmpty(available.mainLocale)) {
      throw new VeyndoError('Checkout returned an invalid country catalogue', { kind: 'protocol' });
    }
    const mainLocale = available.mainLocale;
    const displayLocale = locale ?? mainLocale;
    const byCode = new Map(catalogue.countries.map(country => [country?.code, country]));
    const countries = available.countries.map(code => {
      const country = byCode.get(code);
      if (!country || !country.name || !Array.isArray(country.states)) {
        throw new VeyndoError('A checkout country is missing from the address catalogue', { kind: 'protocol' });
      }
      return {
        code,
        label: geographyName(country.name, displayLocale, mainLocale),
        requiresRegion: country.states.length > 0,
        regions: country.states.map(region => ({
          code: region.code, label: geographyName(region.name, displayLocale, mainLocale),
        })),
      };
    });
    return { ...available, countries };
  }

  function reprice(path, body, access) {
    if (!Number.isSafeInteger(body.revision) || body.revision < 0) {
      throw new TypeError('A current cart revision is required');
    }
    return write(path, {
      method: 'PUT', body, headers: scopedHeaders(cartHeaders(access)), signal: access.signal,
    });
  }

  function create(input, { signal, customerToken } = {}) {
    return write('/store-api/checkout/independent/create', {
      method: 'POST', body: input, headers: scopedHeaders(headers({ customerToken })), signal,
    });
  }

  async function prepare(cart, { requestKey, expiresIn = 900, signal, customerToken } = {}) {
    if (typeof requestKey !== 'string' || !requestKeyPattern.test(requestKey) ||
        !Number.isSafeInteger(expiresIn) || expiresIn < 60 || expiresIn > 604800) {
      throw new TypeError('Checkout preparation requires a stable request key and a lifetime of 60–604800 seconds');
    }
    const country = cart?.checkout?.country;
    const paymentMethod = cart?.checkout?.paymentMethodId;
    const { totalMinor, currency: quotedCurrency } = cart?.price ?? {};
    const legalPolicyVersion = cart?.checkoutService?.legalPolicyVersion;
    if (cart?.status !== 'open' || cart.selectionNeedsConfirmation ||
        !cart.lineItems?.length || !Number.isSafeInteger(cart.revision) || cart.revision < 0 ||
        cart.checkoutService?.transport !== 'same-origin' ||
        ![cart.id, cart.customerId, cart.locale, country, paymentMethod, legalPolicyVersion].every(nonEmpty) ||
        typeof totalMinor !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(totalMinor) ||
        typeof quotedCurrency !== 'string' || !/^[A-Z]{3}$/.test(quotedCurrency)) {
      throw new TypeError('Prepare checkout from the current signed-in buyer cart with reviewed delivery, payment and legal terms');
    }
    const customerId = cart.customerId;
    const context = {
      cart: { backend: 'native', id: cart.id, revision: cart.revision },
      salesChannel: channel ?? 'default', environment: 'live', locale: cart.locale,
      currency: quotedCurrency, country,
    };
    const paypalSandbox = cart.checkoutService.paypalSandbox === true;
    const session = await create({ requestKey, context, expiresIn }, { signal, customerToken });
    if (!validPreparedSession(session, context)) {
      throw new VeyndoError('Checkout returned a different or invalid session; recover it with the same request key', {
        kind: 'protocol', outcomeUnknown: true,
      });
    }
    return {
      session,
      confirmation: {
        id: session.id, revision: session.revision, totalMinor, country, paymentMethod, legalPolicyVersion,
        ...(paypalSandbox ? { paypalSandbox: true } : {}),
      },
      receiptLookup: { sessionId: session.id, cartId: context.cart.id, customerId },
    };
  }

  return Object.freeze({
    legalPolicy({ signal } = {}) {
      return read('/store-api/legal', { headers: scopeHeaders, signal });
    },
    async acceptTerms({ policyVersion, terms, digitalImmediate }, access) {
      if (typeof policyVersion !== 'string' || !/^[a-f0-9]{64}$/.test(policyVersion) ||
          terms !== true || typeof digitalImmediate !== 'boolean') {
        throw new TypeError('Record the buyer’s explicit terms acceptance and separate digital delivery choice');
      }
      const result = await write('/store-api/legal/acceptance', {
        method: 'PUT', body: { policyVersion, terms, digitalImmediate },
        headers: scopedHeaders(cartHeaders(access)), signal: access.signal,
      });
      if (result?.policyVersion !== policyVersion || result.terms !== true ||
          result.digitalImmediate !== digitalImmediate || !nonEmpty(result.locale) || !nonEmpty(result.recordedAt)) {
        throw new VeyndoError('Checkout did not return the recorded acceptance for this policy', {
          kind: 'protocol', outcomeUnknown: true,
        });
      }
      return result;
    },
    options: checkoutOptions,
    addressOptions,
    select(input, access) {
      const selection = input?.checkout;
      if (!Number.isSafeInteger(input?.revision) || input.revision < 0 ||
          ![selection?.country, selection?.shippingMethodId, selection?.paymentMethodId]
            .every(value => typeof value === 'string' && value.trim())) {
        throw new TypeError('Checkout selection requires a country, shipping method, payment method and cart revision');
      }
      return write('/store-api/checkout/context', {
        method: 'PUT', body: input, headers: scopedHeaders(cartHeaders(access)), signal: access.signal,
      });
    },
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
      setCoupons({ codes, revision }, access) {
        if (!Array.isArray(codes) || codes.length > 5 ||
            Array.from(codes).some(code => typeof code !== 'string' ||
              code.length === 0 || code.length > 64 || /[^\x00-\x7F]/.test(code))) {
          throw new TypeError('Supply up to five ASCII coupon codes of 1–64 characters');
        }
        return reprice('/store-api/checkout/coupons', { codes, revision }, access);
      },
      setCurrency({ currency, revision }, access) {
        if (typeof currency !== 'string' || currency.length !== 3 || /[^A-Z]/.test(currency)) {
          throw new TypeError('Supply a three-letter uppercase currency code');
        }
        return reprice('/store-api/checkout/currency', { currency, revision }, access);
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
    payment: Object.freeze({
      async status(attemptId, access) {
        const result = await read(paymentPath(attemptId), {
          headers: scopedHeaders(cartHeaders(access)), signal: access.signal,
        });
        if (result?.id !== attemptId || !nonEmpty(result.state) ||
            ![result.amountMinor, result.capturedMinor, result.refundedMinor, result.currencyScale]
              .every(validMinorAmount) ||
            !validCurrency(result.currency) ||
            !validApprovalUrl(result.approvalUrl)) {
          throw new VeyndoError('Checkout returned an invalid status for this payment attempt', { kind: 'protocol' });
        }
        return result;
      },
      async instructions(attemptId, access) {
        const result = await read(`${paymentPath(attemptId)}/instructions`, {
          headers: scopedHeaders(cartHeaders(access)), signal: access.signal,
        });
        return paymentInstructions(result);
      },
      async reconcile(attemptId, { requestKey } = {}, access) {
        if (typeof requestKey !== 'string' || !requestKeyPattern.test(requestKey)) {
          throw new TypeError('Payment reconciliation requires a stable request key');
        }
        const result = await write(`${paymentPath(attemptId)}/reconcile`, {
          method: 'POST', body: { requestKey }, headers: scopedHeaders(cartHeaders(access)), signal: access.signal,
        });
        if (result?.queued !== true || !nonEmpty(result.jobId)) {
          throw new VeyndoError('Checkout did not acknowledge the payment check; recover it with the same request key', {
            kind: 'protocol', outcomeUnknown: true,
          });
        }
        return result;
      },
    }),
    create,
    prepare,
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
