import type { CallOptions, ClientOptions, JsonValue } from './index.js';
import type { CheckoutAddress, StoreCart } from './checkout.js';

export type AccountOptions = Pick<ClientOptions,
  'baseUrl' | 'shop' | 'credentials' | 'timeoutMs' | 'maxResponseBytes' | 'fetch'> & {
  /** Shop content locale used to resolve download titles. */
  locale?: string;
};

export interface AccountAccess extends CallOptions {
  /** A current buyer token. A same-origin browser can instead use its session cookie. */
  customerToken?: string;
}

export interface BuyerSignIn {
  email: string;
  password: string;
}

export interface BuyerRegistration extends BuyerSignIn {
  name: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phoneNumber?: string;
  billingAddress?: CheckoutAddress;
  shippingAddress?: CheckoutAddress;
}

export interface BuyerBrowserSession {
  register(input: BuyerRegistration, options?: CallOptions): Promise<{ email: string }>;
  /** Adopt the returned cart token for subsequent checkout calls. */
  signIn(input: BuyerSignIn, options: CallOptions & { cartToken: string }): Promise<StoreCart>;
  signOut(options?: CallOptions & { cartToken?: string }): Promise<{ loggedOut: true }>;
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

export interface CustomerContact {
  name: string;
  firstName?: string;
  lastName?: string;
  salutationId?: string;
  title?: string;
  phoneNumber?: string;
  birthday?: string | null;
  company?: string;
  vatIds?: string[];
  defaultPaymentMethodId?: string | null;
}

export interface CustomerProfile {
  id: string;
  email: string;
  customerNumber: string;
  customerGroup: string;
  active: boolean;
  company: string | null;
  revision: number;
  createdAt: string;
  profile: Partial<CustomerContact> & { address?: CheckoutAddress | null };
  addresses: CustomerAddressBook;
  defaultBillingAddressId: string | null;
  defaultShippingAddressId: string | null;
  salesChannelId: string;
  languageId: string;
  firstLogin: string | null;
  lastLogin: string | null;
  lastPaymentMethodId: string | null;
  orderCount: number;
  orderTotalAmount: number;
  lastOrderDate: string | null;
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

export interface CustomerDownload {
  id: string;
  orderId: string;
  title: Record<string, string>;
  name: string;
  filename: string;
}

export interface CustomerDownloadFile {
  bytes: Uint8Array;
  mime: string;
}

export interface AccountClient {
  /** Requires a browser on baseUrl, the shop ID and credentials: 'same-origin'. */
  session: BuyerBrowserSession;
  downloads: {
    list(buyer?: AccountAccess): Promise<{ elements: CustomerDownload[] }>;
    file(orderId: string, assetId: string, buyer?: AccountAccess): Promise<CustomerDownloadFile>;
  };
  profile: {
    get(buyer?: AccountAccess): Promise<CustomerProfile>;
    /** Replace the editable contact fields. Send the current values you want to keep. */
    save(contact: CustomerContact, buyer?: AccountAccess): Promise<{ saved: true }>;
  };
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
