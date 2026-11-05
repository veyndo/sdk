/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs11 {
  "merchant.site.propose": {
    fields: JsonValue;
    id: string;
    instruction: string;
    revision: number;
    selected?: string;
    summary?: string;
  };
  "merchant.site.plan": {
    content?: boolean;
    id: string;
    images?: Array<string>;
    instruction: string;
    revision: number;
    selected?: string;
    structure?: boolean;
    style?: boolean;
    urls?: Array<string>;
  };
  "merchant.site.apply": { approve: boolean; taskId: string };
  "merchant.reports.read": {
    channel?: string | null;
    channelType?: "all" | "storefront" | "headless" | "marketplace" | "pos";
    compare?: boolean;
    currency?: string | null;
    from?: string | null;
    interval?: "auto" | "day" | "week" | "month" | "year";
    period?:
      | "today"
      | "yesterday"
      | "week"
      | "last7"
      | "last30"
      | "last90"
      | "month"
      | "lastMonth"
      | "year"
      | "lastYear"
      | "all"
      | "custom";
    timezone?: string;
    to?: string | null;
  };
  "studio.workspace.work.read": JsonValue;
  "studio.workspace.read": JsonValue;
  "studio.workspace.save": { data: JsonValue; revision: number };
  "merchant.import.inspect": {
    details?: boolean;
    options: {
      acknowledgedWarnings?: Array<string>;
      channelId?: string;
      customerGroup?: string;
      destinationDigest?: string;
      locale?: string;
      sourcePriceBasis?: "gross" | "net";
      taxRate?: number;
    };
    record: {
      data: JsonValue;
      kind:
        | "products"
        | "categories"
        | "pages"
        | "customers"
        | "orders"
        | "assets"
        | "reviews"
        | "coupons";
      source: string;
      sourceId: string;
      sourceShop: string;
      version: 1;
      warnings: Array<string>;
    };
  };
  "merchant.import.record": {
    approve: boolean;
    assetChunks?: Array<string>;
    options: {
      acknowledgedWarnings?: Array<string>;
      channelId?: string;
      customerGroup?: string;
      destinationDigest?: string;
      locale?: string;
      sourcePriceBasis?: "gross" | "net";
      taxRate?: number;
    };
    record: {
      data: JsonValue;
      kind:
        | "products"
        | "categories"
        | "pages"
        | "customers"
        | "orders"
        | "assets"
        | "reviews"
        | "coupons";
      source: string;
      sourceId: string;
      sourceShop: string;
      version: 1;
      warnings: Array<string>;
    };
  };
  "merchant.customer.creation": JsonValue;
  "merchant.customer.create": {
    additionalAddresses?: Array<JsonValue>;
    billingAddress: JsonValue;
    customerGroup: string;
    email: string;
    profile: JsonValue;
    requestKey: string;
    shippingAddress?: JsonValue | null;
  };
  "merchant.order.context": { channelId: string; locale?: string };
}
