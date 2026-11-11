import type { CallOptions, ClientOptions, JsonValue } from './index.js';

export interface CatalogOptions extends Omit<ClientOptions, 'mcpPath' | 'protocolVersion' | 'mcpApps'> {
  channel?: string;
  locale?: string;
  currency?: string;
}

export interface CatalogPaging {
  /** Page size from 1 to 100. */
  limit?: number;
  /** Cursor returned by the preceding response in the same catalog scope. */
  after?: string;
}

export interface CatalogCriteria extends CatalogPaging {
  search?: string;
  category?: string;
  categoryId?: string;
  ids?: string[];
}

export interface CatalogPagination {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CatalogCurrencyContext {
  code: string;
  scale: number;
  factor: string;
  baseCurrency: string;
  pricingCurrency: string;
  pricingFactor: string | null;
  strategy: string;
  rateSource: string;
  rateDate: string | null;
}

export interface CatalogProduct {
  id: string;
  product_number: string;
  parent_id: string | null;
  name: string;
  description: string;
  category: string;
  /** Display amount in major currency units. Use Checkout to price purchases. */
  price: number;
  currency: string;
  stock: number;
  options: JsonValue;
  media: JsonValue;
}

export interface CatalogPage extends CatalogPagination {
  elements: Array<CatalogProduct & { currencyScale: number; calculated_price: JsonValue }>;
  /** Available when the response contains the complete result in one page. */
  total: number | null;
  locale: string;
  languageIdChain: string[];
  currencyContext: CatalogCurrencyContext;
  availableCurrencies: string[];
}

export interface CatalogReview {
  id: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  verifiedPurchase: boolean;
  demo: boolean;
  imported: boolean;
  time: string;
}

export interface CatalogDetail {
  product: CatalogProduct & { variantLabel: string };
  familyId: string;
  /** The visible parent and selected SKU can repeat across pages. */
  variants: CatalogProduct[];
  variantsPagination: CatalogPagination;
  currencyContext: CatalogCurrencyContext;
  availableCurrencies: string[];
  calculatedPrices: Array<{ quantity: number; price: JsonValue; discountPercent: number | null }>;
  delivery: { method: JsonValue; minDays: number; maxDays: number } | null;
  taxStatus: 'net' | 'gross';
  country: string;
  reviews: { count: number; average: number; elements: CatalogReview[] };
}

export interface CatalogClient {
  list(criteria?: CatalogCriteria, options?: CallOptions): Promise<CatalogPage>;
  detail(id: string, paging?: CatalogPaging, options?: CallOptions): Promise<CatalogDetail>;
}

export function createCatalogClient(options: CatalogOptions): CatalogClient;
