/** Generated from contracts/host-exchange-v1.json; do not edit. */
import type { JsonValue } from "./value.js";
export interface HostInputs {
  "record_action": { "action": string; "input": Record<string, JsonValue> };
  "channel": { "channelId": string; "id"?: string; "currency"?: string };
  "channel_product": { "channelId": string; "id": string; "currency"?: string };
  "order_import": { "salesChannelId": string; "externalId": string; "currency": string; "locale": string; "email": string; "billingAddress": { "name"?: string; "firstName"?: string; "lastName"?: string; "salutationId"?: string; "title"?: string; "company"?: string; "department"?: string; "vatId"?: string; "street": string; "postalCode": string; "city": string; "country"?: string; "countryStateId"?: string; "additionalAddressLine1"?: string; "additionalAddressLine2"?: string; "phoneNumber"?: string }; "shippingAddress": { "name"?: string; "firstName"?: string; "lastName"?: string; "salutationId"?: string; "title"?: string; "company"?: string; "department"?: string; "vatId"?: string; "street": string; "postalCode": string; "city": string; "country"?: string; "countryStateId"?: string; "additionalAddressLine1"?: string; "additionalAddressLine2"?: string; "phoneNumber"?: string }; "lines": Array<{ "productId": string; "quantity": number; "amount": { "grossMinor": number; "taxMinor": number; "taxRateBasisPoints": number } }>; "shipping": { "grossMinor": number; "taxMinor": number; "taxRateBasisPoints": number }; "totalMinor": number; "paid": boolean };
  "job_enqueue": { "action": string; "input": Record<string, JsonValue>; "requestKey": string };
  "job_claim": { "id": string };
  "job_progress": { "id": string; "lease": string; "progress"?: number; "status"?: "running" | "succeeded" | "failed" | "cancelled"; "message"?: Record<string, JsonValue>; "result"?: Record<string, JsonValue>; "checkpoint"?: Record<string, JsonValue> };
}
