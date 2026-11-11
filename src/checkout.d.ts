import type { CallOptions, ClientOptions } from './index.js';

export interface CheckoutOptions extends Pick<ClientOptions,
  'baseUrl' | 'shop' | 'credentials' | 'timeoutMs' | 'maxResponseBytes' | 'fetch'> {
  channel?: string;
  locale?: string;
  currency?: string;
}

export interface CheckoutBuyer extends CallOptions {
  /** A current buyer token. A same-origin client can instead use its session cookie. */
  customerToken?: string;
}

export interface CartAccess extends CheckoutBuyer {
  cartToken: string;
}

export interface CartItem {
  id: string;
  quantity: number;
}

export interface CartLine extends CartItem {
  referencedId: string;
  label: string;
  stock: number;
  price: { unitPrice: number; totalPrice: number };
}

export interface CartPrice {
  /** Exact amount, present on current Store API quotes. */
  totalMinor?: string;
  currency: string;
  currencyScale: number;
  positionPrice: number;
  totalPrice: number;
  netPrice: number;
  tax: number;
  taxStatus: string;
}

export interface CartDelivery {
  earliest: string;
  latest: string;
}

export interface StoreCart {
  id: string;
  token: string;
  revision: number;
  status: string;
  locale?: string;
  customerId?: string | null;
  lineItems: CartLine[];
  price: CartPrice;
  checkout: { country: string; shippingMethodId: string; paymentMethodId: string };
  checkoutService?: {
    transport: 'same-origin' | 'direct';
    legalPolicyVersion: string;
    paypalSandbox?: true;
  };
  shippingCosts: { totalPrice: number };
  deliveries: Array<{ deliveryDate: CartDelivery }>;
}

export interface CartReviewInput {
  /** The full proposed basket, in place of its current contents. */
  items: CartItem[];
  revision: number;
}

export interface CartReview {
  revision: number;
  review: string;
  lineItems: CartLine[];
  price: CartPrice;
  country: string;
  shippingCosts: { totalPrice: number };
  delivery: CartDelivery | null;
  shippingMethod: string | null;
}

export interface StoreCartClient {
  create(input?: { session?: string }, buyer?: CheckoutBuyer & { cartToken?: string }): Promise<StoreCart>;
  read(access: CartAccess): Promise<StoreCart>;
  add(input: { items: Array<{ referencedId: string; quantity: number }> }, access: CartAccess): Promise<StoreCart>;
  preview(input: CartReviewInput, access: CartAccess): Promise<CartReview>;
  apply(input: CartReviewInput & { review: string }, access: CartAccess): Promise<StoreCart>;
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
  cart: StoreCartClient;
  create(input: CheckoutCreate, buyer?: CheckoutBuyer): Promise<CheckoutSession>;
  confirm(input: CheckoutConfirmation, buyer: CartAccess): Promise<CheckoutReceipt>;
  /** Read the original order without submitting another purchase. */
  receipt(input: CheckoutReceiptLookup, buyer?: CheckoutBuyer): Promise<CheckoutReceipt & CheckoutReceiptLookup>;
}

export function createCheckoutClient(options: CheckoutOptions): CheckoutClient;
