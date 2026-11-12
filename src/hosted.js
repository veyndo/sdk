/** One explicit shop scope for a backend using Veyndo Commerce as a service. */
import { createClient } from './index.js';
import { createCatalogClient } from './catalog.js';
import { createCheckoutClient } from './checkout.js';
import { createAccountClient } from './account.js';
import { transport, VeyndoError } from './transport.js';

export const hostedOrigin = 'https://api.veyndo.ai';

export function createHostedShop({
  shop, baseUrl = hostedOrigin, channel, locale, currency,
  merchantToken, timeoutMs, maxResponseBytes, fetch,
}) {
  if (typeof shop !== 'string' || !/^[a-z0-9][a-z0-9-]{0,46}[a-z0-9]$/.test(shop)) {
    throw new TypeError('shop must be a Veyndo shop ID (2–48 lowercase letters, numbers or hyphens)');
  }

  const connection = { baseUrl, timeoutMs, maxResponseBytes, fetch };
  const scope = { ...connection, shop, channel, locale, currency };
  const request = transport(connection, { readOnly: true });

  return Object.freeze({
    baseUrl: new URL(baseUrl).origin,
    shop,
    catalog: createCatalogClient(scope),
    checkout: createCheckoutClient(scope),
    account: createAccountClient(scope),
    mcp: createClient({ ...scope, token: merchantToken }),
    async describe({ signal } = {}) {
      const profile = await request('/.well-known/veyndo', { signal });
      const endpoints = profile?.endpoints;
      if (profile?.version !== 1 || profile.mode !== 'api-only' ||
          typeof profile.name !== 'string' || typeof profile.documentation !== 'string' ||
          profile.shopHeader !== 'x-tenant' || endpoints?.store !== '/store-api' ||
          endpoints?.admin !== '/api' || endpoints?.mcp !== '/mcp' ||
          endpoints?.health !== '/health' || endpoints?.ucp !== '/.well-known/ucp') {
        throw new VeyndoError('This origin does not advertise Veyndo API profile v1', { kind: 'protocol' });
      }
      return profile;
    },
  });
}
