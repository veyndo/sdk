import type { AccountClient } from './account.js';
import type { CatalogClient, CatalogOptions } from './catalog.js';
import type { CheckoutClient } from './checkout.js';
import type { CallOptions, Client, ClientOptions } from './index.js';

export const hostedOrigin: 'https://api.veyndo.ai';

export interface HostedShopOptions extends Pick<CatalogOptions,
  'channel' | 'locale' | 'currency' | 'timeoutMs' | 'maxResponseBytes' | 'fetch'> {
  shop: string;
  /** HTTPS API origin. HTTP is allowed for a local loopback test. */
  baseUrl?: string;
  /** Server-side credential. Sent only by the MCP/merchant client. */
  merchantToken?: ClientOptions['token'];
}

export interface HostedProfile {
  version: 1;
  mode: 'api-only';
  shopHeader: 'x-tenant';
  endpoints: { health: '/health'; store: '/store-api'; admin: '/api'; mcp: '/mcp'; ucp: '/.well-known/ucp' };
  name: string;
  documentation: string;
}

export interface HostedShop {
  readonly baseUrl: string;
  readonly shop: string;
  readonly catalog: CatalogClient;
  readonly checkout: CheckoutClient;
  readonly account: AccountClient;
  readonly mcp: Client;
  describe(options?: CallOptions): Promise<HostedProfile>;
}

export function createHostedShop(options: HostedShopOptions): HostedShop;
