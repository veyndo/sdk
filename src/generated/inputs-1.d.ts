/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs1 {
  "merchant.history": {
    before?: number;
    entity:
      | "role"
      | "product"
      | "category"
      | "customer"
      | "order"
      | "settings"
      | "company"
      | "companyChannel"
      | "checkoutChannel"
      | "rule"
      | "flow"
      | "promotion"
      | "channel"
      | "source"
      | "b2bCompany"
      | "b2bUnit"
      | "b2bQuote"
      | "b2bList"
      | "b2bApproval";
    id: string;
  };
  "merchant.history.version": {
    entity:
      | "role"
      | "product"
      | "category"
      | "customer"
      | "order"
      | "settings"
      | "company"
      | "companyChannel"
      | "checkoutChannel"
      | "rule"
      | "flow"
      | "promotion"
      | "channel"
      | "source"
      | "b2bCompany"
      | "b2bUnit"
      | "b2bQuote"
      | "b2bList"
      | "b2bApproval";
    id: string;
    version: number;
  };
  "merchant.history.restore": {
    approve: true;
    entity:
      | "role"
      | "product"
      | "category"
      | "customer"
      | "order"
      | "settings"
      | "company"
      | "companyChannel"
      | "checkoutChannel"
      | "rule"
      | "flow"
      | "promotion"
      | "channel"
      | "source"
      | "b2bCompany"
      | "b2bUnit"
      | "b2bQuote"
      | "b2bList"
      | "b2bApproval";
    id: string;
    revision: number;
    side: "before" | "after";
    version: number;
  };
  "merchant.customer.groups": JsonValue;
  "merchant.media.list": { productId: string };
  "merchant.commerce.dependencies": {
    area: "shipping" | "payments";
    methodId: string;
  };
  "merchant.media.provider": JsonValue;
  "merchant.media.create": {
    mode: "generate" | "optimize";
    productId: string;
    prompt: string;
    revision: number;
    sourceId?: string | null;
  };
  "merchant.media.detail": { id: string };
  "merchant.media.apply": { id: string; revision: number };
  "merchant.company": { channelId?: string };
  "merchant.company.save": {
    baseRevision?: number;
    channelId?: string;
    data: JsonValue;
    revision: number;
  };
}
