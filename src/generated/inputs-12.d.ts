/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs12 {
  "merchant.order.review": {
    channelId: string;
    checkout: JsonValue;
    codes?: Array<string>;
    currency: string;
    customerId: string;
    items: Array<{ id: string; quantity: number }>;
    locale: string;
  };
  "merchant.order.complete": {
    approve: boolean;
    cartToken: string;
    channelId: string;
    customerAcknowledgement: boolean;
    digitalImmediate: boolean;
    locale: string;
    policyVersion: string;
    requestKey: string;
    revision: number;
    terms: boolean;
    totalMinor: string;
  };
  "merchant.catalog.context": JsonValue;
  "merchant.catalog.prepare": {
    count: number;
    inference?: {
      model?: string | null;
      provider?: "platform" | "ollama" | "openai" | "anthropic";
    } | null;
    mode: "csv" | "url" | "demo" | "shopify_csv" | "shop_mcp";
    shopDomain?: string;
    source: string;
  };
  "merchant.catalog.save": {
    approve: boolean;
    currency: string;
    demo: boolean;
    draft: {
      description: string;
      imageUrl?: string;
      name: string;
      price: number;
      productNumber?: string;
      source?: {
        externalId: string;
        provider: "shopify_csv" | "shop_mcp";
        url?: string;
      };
    };
    id: string;
    mainLocale: string;
    settingsRevision: number;
    taxRate: number;
  };
  "pos.customers": { barcode?: string; channelId: string; query?: string };
  "pos.customer": {
    cartToken: string;
    channelId: string;
    customerId: string | null;
    revision: number;
  };
  "pos.discount": {
    cartToken: string;
    channelId: string;
    discount: JsonValue;
    revision: number;
  };
  "pos.receipt": { channelId: string; orderId: string; receiptId: string };
  "pos.channels": JsonValue;
  "pos.payment": { cartToken: string; channelId: string };
  "pos.reconcile": { cartToken: string; channelId: string; requestKey: string };
}
