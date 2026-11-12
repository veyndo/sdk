import type { CallOptions, ClientOptions } from './index.js';
import type { CatalogCurrencyContext } from './catalog.js';

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

export interface CheckoutAddress {
  name?: string;
  firstName?: string;
  lastName?: string;
  salutationId?: string;
  title?: string;
  company?: string;
  department?: string;
  vatId?: string;
  street: string;
  postalCode: string;
  city: string;
  country?: string;
  countryStateId?: string;
  additionalAddressLine1?: string;
  additionalAddressLine2?: string;
  phoneNumber?: string;
}

export interface CheckoutSelection {
  country: string;
  shippingMethodId: string;
  paymentMethodId: string;
  address?: CheckoutAddress | null;
  billingAddress?: CheckoutAddress | null;
  shippingAddressId?: string | null;
  billingAddressId?: string | null;
  customerEmail?: string | null;
  paymentFunding?: { save?: boolean; id?: string | null } | null;
}

interface CheckoutMethod {
  id: string;
  name: string;
  description: string;
  countries: string[];
}

export interface CheckoutShippingMethod extends CheckoutMethod {
  /** Display amounts in the requested currency. */
  price: number;
  freeAbove: number | null;
  minDays: number;
  maxDays: number;
}

export interface CheckoutPaymentMethod extends CheckoutMethod {
  mode: string;
  businessOnly: boolean;
  restrictedCountries: boolean;
  provider?: string;
  providerMethod?: string;
}

export interface CheckoutAvailability {
  mainLocale: string;
  locales: string[];
  countries: string[];
  currencyContext: CatalogCurrencyContext;
  shipping: CheckoutShippingMethod[];
  payments: CheckoutPaymentMethod[];
  /** Configuration revision. Use StoreCart.revision to submit a selection. */
  revision: number;
}

export interface CheckoutAddressCountry {
  /** Use as CheckoutAddress.country. */
  code: string;
  label: string;
  requiresRegion: boolean;
  /** Send the selected code as CheckoutAddress.countryStateId. */
  regions: Array<{ code: string; label: string }>;
}

export interface CheckoutAddressOptions extends Omit<CheckoutAvailability, 'countries'> {
  countries: CheckoutAddressCountry[];
}

export type CheckoutDocument = 'privacy' | 'terms' | 'withdrawal' | 'shipping' | 'accessibility' | 'disputes';
export type CheckoutPrivacyPurpose = 'analytics' | 'personalization' | 'externalMedia' | 'maps' | 'marketing';

export interface CheckoutLegalPolicy {
  policyVersion: string;
  mainLocale: string;
  locales: string[];
  salesChannelId: string;
  data: {
    strictCheckout: boolean;
    consentDays: number;
    behaviorAnalytics: { enabled: boolean; retentionDays: number; eventsPerHour: number };
    purposes: Partial<Record<CheckoutPrivacyPurpose, boolean>>;
    services: Array<{ id: string; provider: string; purpose: CheckoutPrivacyPurpose;
      description: Record<string, string>; retention: string; privacyUrl: string }>;
    documents: Partial<Record<CheckoutDocument, Record<string, string>>>;
    sectors: string[];
  };
}

export interface CheckoutTermsAcceptance {
  /** The policy version shown to the buyer. */
  policyVersion: string;
  /** The buyer actively accepted the displayed terms. */
  terms: true;
  /** The buyer separately requested immediate digital delivery, where applicable. */
  digitalImmediate: boolean;
}

export interface CheckoutTermsReceipt extends CheckoutTermsAcceptance {
  locale: string;
  recordedAt: string;
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
  /** The original order snapshot, when reading a completed cart. */
  order?: NativeCheckoutOrder | null;
  locale?: string;
  customerId?: string | null;
  lineItems: CartLine[];
  price: CartPrice;
  checkout: CheckoutSelection;
  /** Core's acknowledgement requirements for the current cart. */
  legal?: { strictCheckout: boolean; requiresDigital: boolean };
  selectionNeedsConfirmation?: boolean;
  availableCountries?: string[];
  availableShippingMethods?: CheckoutShippingMethod[];
  availablePaymentMethods?: CheckoutPaymentMethod[];
  currencyContext?: CatalogCurrencyContext;
  availableCurrencies?: string[];
  /** Submitted codes. Check discounts and total to see which promotions applied. */
  couponCodes?: string[];
  discounts?: Array<{ id: string; name: Record<string, string>; kind: string; amount: number }>;
  /** Display amount in major units of the cart currency. */
  discountTotal?: number;
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
  /** Replace all coupon codes and return the new quote. Pass [] to clear them. */
  setCoupons(input: { codes: string[]; revision: number }, access: CartAccess): Promise<StoreCart>;
  /** Select an enabled currency for the current cart and return its new quote. */
  setCurrency(input: { currency: string; revision: number }, access: CartAccess): Promise<StoreCart>;
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

export interface NativeCheckoutOrder {
  id: string;
  orderNumber: string;
  state: string;
  cart: {
    id: string;
    revision: number;
    price: CartPrice & { totalMinor: string };
    lineItems: CartLine[];
  };
  payment: {
    method: { id: string };
    provider: string;
    state: string;
    realMoneyCharged: boolean;
    attemptId?: string;
  };
}

export interface CheckoutPaymentStatus {
  id: string;
  provider: string;
  environment: string;
  state: string;
  checkout: string | null;
  intent: string | null;
  approvalUrl: string | null;
  amountMinor: number;
  capturedMinor: number;
  refundedMinor: number;
  currency: string;
  currencyScale: number;
  captureClosed: boolean;
  revision: number;
  job: { id: string; operation: string; state: string } | null;
  savedPaymentMethodStatus: string | null;
  instructionsAvailable: boolean;
  realMoneyCharged: boolean;
}

export interface CheckoutPaymentJob {
  jobId: string;
  queued: true;
}

export interface CheckoutBankTransferInstructions {
  kind: 'bank_transfer';
  paymentReference: string;
  iban: string;
  bic: string;
  bankName: string;
  accountHolderName: string;
}

interface CheckoutInstructionAmount {
  amountMinor: number;
  currency: string;
  currencyScale: number;
  simulated: boolean;
}

export type CheckoutPaymentInstructions =
  | { status: 'unsupported'; instructions: null }
  | (CheckoutInstructionAmount & { status: 'pending'; instructions: null })
  | (CheckoutInstructionAmount & { status: 'available'; instructions: CheckoutBankTransferInstructions });

export interface CheckoutPaymentClient {
  /** Read provider state using the attempt ID and original cart token. */
  status(attemptId: string, access: CartAccess): Promise<CheckoutPaymentStatus>;
  /** Read recipient instructions for the original cart. This does not settle the payment. */
  instructions(attemptId: string, access: CartAccess): Promise<CheckoutPaymentInstructions>;
  /** Queue a provider check after buyer approval. It may capture an approved payment. */
  reconcile(attemptId: string, input: { requestKey: string }, access: CartAccess): Promise<CheckoutPaymentJob>;
}

export interface CheckoutPrepareOptions extends CheckoutBuyer {
  /** Keep the same key when retrying preparation of the same reviewed cart. */
  requestKey: string;
  /** From 60 to 604800 seconds. Defaults to 900. */
  expiresIn?: number;
}

export interface PreparedCheckout {
  session: CheckoutSession;
  /** Supply confirmed: true only after explicit buyer approval. */
  confirmation: Omit<CheckoutConfirmation, 'confirmed'>;
  receiptLookup: CheckoutReceiptLookup;
}

export interface CheckoutClient {
  /** Read the public documents and policy version for the selected sales channel. */
  legalPolicy(options?: CallOptions): Promise<CheckoutLegalPolicy>;
  /** Record an explicit buyer decision on this cart. A newer policy returns HTTP 409. */
  acceptTerms(input: CheckoutTermsAcceptance, access: CartAccess): Promise<CheckoutTermsReceipt>;
  /** List configured candidates. Core validates their country and cart eligibility on select. */
  options(access?: CheckoutBuyer & { cartToken?: string }): Promise<CheckoutAvailability>;
  /** Localized country and region choices with shipping and payment candidates. */
  addressOptions(access?: CheckoutBuyer & { cartToken?: string }): Promise<CheckoutAddressOptions>;
  select(input: { revision: number; checkout: CheckoutSelection }, access: CartAccess): Promise<StoreCart>;
  cart: StoreCartClient;
  payment: CheckoutPaymentClient;
  create(input: CheckoutCreate, buyer?: CheckoutBuyer): Promise<CheckoutSession>;
  /** Prepare a draft from a reviewed signed-in buyer cart on the relay. */
  prepare(cart: StoreCart, options: CheckoutPrepareOptions): Promise<PreparedCheckout>;
  /** Place a reviewed native Store API order after explicit buyer approval. Reuse the same review and key after a lost response. */
  place(cart: StoreCart, input: { requestKey: string; confirmed: true }, access: CartAccess): Promise<NativeCheckoutOrder>;
  confirm(input: CheckoutConfirmation, buyer: CartAccess): Promise<CheckoutReceipt>;
  /** Read the original order without submitting another purchase. */
  receipt(input: CheckoutReceiptLookup, buyer?: CheckoutBuyer): Promise<CheckoutReceipt & CheckoutReceiptLookup>;
}

export function createCheckoutClient(options: CheckoutOptions): CheckoutClient;
