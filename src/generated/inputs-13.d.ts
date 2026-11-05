/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs13 {
  "pos.catalog": {
    after?: string;
    barcode?: string;
    cartToken?: string;
    channelId: string;
    query?: string;
  };
  "pos.context": { channelId: string };
  "pos.detail": {
    after?: string;
    cartToken?: string;
    channelId: string;
    productId: string;
  };
  "pos.currency": {
    cartToken: string;
    channelId: string;
    currency: string;
    revision: number;
  };
  "pos.coupons": {
    cartToken: string;
    channelId: string;
    codes: Array<string>;
    revision: number;
  };
  "pos.create": { channelId: string };
  "pos.cart": { cartToken: string; channelId: string };
  "pos.replace": {
    cartToken: string;
    channelId: string;
    items: Array<{ id: string; quantity: number }>;
    revision: number;
  };
  "pos.select": {
    cartToken: string;
    channelId: string;
    checkout: JsonValue;
    revision: number;
  };
  "pos.accept": {
    cartToken: string;
    channelId: string;
    digitalImmediate: boolean;
    policyVersion: string;
    terms: boolean;
  };
  "pos.complete": {
    cartToken: string;
    channelId: string;
    requestKey: string;
    revision: number;
    tenderMinor?: string;
    totalMinor: string;
  };
  "pos.held": { channelId: string };
}
