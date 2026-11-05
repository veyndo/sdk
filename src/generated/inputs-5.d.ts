/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs5 {
  "merchant.receipt.create": {
    deliveryIndex?: number;
    id: string;
    kind: "invoice" | "delivery_note" | "cancellation";
    locale: "en" | "de" | "fr" | "es";
    referenceId?: string;
    requestKey: string;
    revision: number;
  };
  "developer.archive": { app: string; approve: boolean; archived: boolean };
  "developer.builds": JsonValue;
  "developer.import": {
    environment: string;
    manifest: JsonValue;
    prompt: string;
    summary: JsonValue;
  };
  "developer.stage": { approve: boolean; buildId: string; digest: string };
  "developer.task": {
    agent: string;
    context?: {
      channel: "*";
      language: string;
      selected: string;
      view: string;
    };
    environment: string;
    manifest?: JsonValue;
    prompt: string;
    references?: { images?: Array<string>; urls?: Array<string> };
  };
  "catalog.search": {
    after?: string;
    category?: string;
    categoryId?: string;
    ids?: Array<string>;
    limit?: number;
    query?: string;
    search?: string;
  };
  "catalog.detail": { after?: string; limit?: number; productId: string };
  "checkout.options": JsonValue;
  "checkout.select": {
    checkout: {
      address?: JsonValue | null;
      billingAddress?: JsonValue | null;
      billingAddressId?: string | null;
      country?: string;
      customerEmail?: string | null;
      paymentMethodId?: string;
      shippingAddressId?: string | null;
      shippingMethodId?: string;
    };
    revision: number;
  };
  "knowledge.graph": JsonValue;
  "knowledge.search": { query?: string };
}
