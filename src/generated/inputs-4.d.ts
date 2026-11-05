/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs4 {
  "merchant.asset.publish": { digest: string; id: string; public: boolean };
  "merchant.customer.addresses": { id: string };
  "merchant.customer.address.save": {
    address: JsonValue;
    addressId?: string;
    defaultBilling?: boolean;
    defaultShipping?: boolean;
    id: string;
    revision?: number;
  };
  "merchant.customer.address.delete": {
    addressId: string;
    id: string;
    revision: number;
  };
  "merchant.customers": {
    active?: boolean;
    after?: string;
    appFilter?: string;
    direction?: "asc" | "desc";
    group?: string;
    guest?: boolean;
    limit?: number;
    query?: string;
    sort?: "email" | "name" | "created" | "number";
  };
  "merchant.customer": { id: string };
  "merchant.customer.save": { customer: JsonValue; id: string };
  "merchant.order": { id: string };
  "merchant.order.transition": {
    action?: string;
    deliveryIndex?: number;
    id: string;
    kind: "order" | "payment" | "delivery";
    requestKey?: string;
    revision: number;
    state: string;
    trackingCode?: string;
    trackingUrl?: string;
  };
  "merchant.order.note": { id: string; revision: number; text: string };
  "merchant.delivery.split": {
    deliveryIndex: number;
    id: string;
    positions: Array<{ id: string; quantity: number }>;
    requestKey: string;
    revision: number;
  };
  "merchant.receipts": { id: string };
}
