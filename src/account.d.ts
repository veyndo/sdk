import type { CallOptions, ClientOptions, JsonValue } from './index.js';
import type { CheckoutAddress } from './checkout.js';

export type AccountOptions = Pick<ClientOptions,
  'baseUrl' | 'shop' | 'credentials' | 'timeoutMs' | 'maxResponseBytes' | 'fetch'>;

export interface AccountAccess extends CallOptions {
  /** A current buyer token. A same-origin browser can instead use its session cookie. */
  customerToken?: string;
}

export interface CustomerAddress {
  id: string;
  revision: number;
  address: CheckoutAddress;
}

export interface CustomerAddressBook {
  elements: CustomerAddress[];
  defaultBillingAddressId: string | null;
  defaultShippingAddressId: string | null;
  customerRevision: number;
}

export interface CustomerAddressInput {
  address: CheckoutAddress;
  defaultBilling?: boolean;
  defaultShipping?: boolean;
}

export interface CustomerAddressUpdate extends CustomerAddressInput {
  revision: number;
}

export interface CustomerAddressSaved {
  id: string;
  saved: true;
}

export interface CustomerOrderLine {
  id: string;
  label: string;
  quantity: number;
  price: { unitPrice: number; totalPrice: number };
}

export interface CustomerOrderPrice {
  totalPrice: number;
  netPrice?: number;
  currency?: string;
  currencyScale?: number;
  /** Exact amount when present on the stored cart snapshot. */
  totalMinor?: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  orderDateTime: string | null;
  revision: number | null;
  state: string | null;
  stateLabels: Record<string, string | Record<string, string>>;
  billingAddress: CheckoutAddress | null;
  shippingAddress: CheckoutAddress | null;
  billingAddressId: string | null;
  shippingAddressId: string | null;
  cart: {
    id: string | null;
    price: CustomerOrderPrice | null;
    shippingCosts: { totalPrice: number } | null;
    lineItems: CustomerOrderLine[] | null;
  };
  payment: { state: string | null; provider: string | null; method: JsonValue };
  deliveries: JsonValue[] | null;
}

export interface CustomerOrderReceipt {
  id: string;
  kind: string;
  number: string;
  locale: string;
  createdAt: string;
  /** The existing authenticated Store API PDF path. */
  pdfPath: string;
}

export interface CustomerOrderDetail extends CustomerOrder {
  receipts: CustomerOrderReceipt[];
}

export interface CustomerOrderPage {
  elements: CustomerOrder[];
  /** Pass back as after with the same shop and buyer context. */
  nextCursor: string | null;
}

export interface AccountClient {
  addresses: {
    list(buyer?: AccountAccess): Promise<CustomerAddressBook>;
    create(input: CustomerAddressInput, buyer?: AccountAccess): Promise<CustomerAddressSaved>;
    update(id: string, input: CustomerAddressUpdate, buyer?: AccountAccess): Promise<CustomerAddressSaved>;
    remove(id: string, input: { revision: number }, buyer?: AccountAccess): Promise<{ deleted: true }>;
  };
  orders: {
    list(input?: { after?: string }, buyer?: AccountAccess): Promise<CustomerOrderPage>;
    detail(id: string, buyer?: AccountAccess): Promise<CustomerOrderDetail>;
    /** Download a visible receipt for an owned order, within maxResponseBytes. */
    receiptPdf(orderId: string, receiptId: string, buyer?: AccountAccess): Promise<Uint8Array>;
  };
}

export function createAccountClient(options: AccountOptions): AccountClient;
