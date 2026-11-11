import type { CallOptions, ClientOptions } from './index.js';

export type CheckoutOptions = Pick<ClientOptions,
  'baseUrl' | 'shop' | 'credentials' | 'timeoutMs' | 'maxResponseBytes' | 'fetch'>;

export interface CheckoutBuyer extends CallOptions {
  /** A current buyer token. A same-origin client can instead use its session cookie. */
  customerToken?: string;
}

export interface CheckoutContext {
  cart: { backend: 'native'; id: string; revision: number };
  salesChannel: string;
  environment: 'live';
  locale: string;
  currency: string;
  country?: string | null;
}

export interface CheckoutCreate {
  requestKey: string;
  context: CheckoutContext;
  expiresIn: number;
}

export interface CheckoutSession {
  id: string;
  context: CheckoutContext;
  preferences: { shippingMethod?: string | null; paymentMethod?: string | null };
  revision: number;
  state: 'draft' | 'cancelled';
  expiresAt: string;
  commerceValidated: false;
}

export interface CheckoutConfirmation {
  id: string;
  revision: number;
  confirmed: true;
  /** Exact amount from the reviewed quote, in minor currency units. */
  totalMinor: string;
  country: string;
  paymentMethod: string;
  legalPolicyVersion: string;
  paypalSandbox?: boolean;
}

export interface CheckoutReceipt {
  sessionId: string;
  orderId: string;
  orderNumber: string;
  orderState: string;
  paymentState: string;
  currency: string;
  totalMinor: string;
  paymentAttemptId?: string;
}

export interface CheckoutReceiptLookup {
  sessionId: string;
  cartId: string;
  customerId: string;
}

export interface CheckoutClient {
  create(input: CheckoutCreate, buyer?: CheckoutBuyer): Promise<CheckoutSession>;
  confirm(input: CheckoutConfirmation, buyer: CheckoutBuyer & { cartToken: string }): Promise<CheckoutReceipt>;
  /** Read the original order without submitting another purchase. */
  receipt(input: CheckoutReceiptLookup, buyer?: CheckoutBuyer): Promise<CheckoutReceipt & CheckoutReceiptLookup>;
}

export function createCheckoutClient(options: CheckoutOptions): CheckoutClient;
