/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs0 {
  "currency.list": JsonValue;
  "currency.select": { currency: string; revision: number };
  "merchant.currencies.refresh": { revision: number };
  "merchant.currencies.generate": {
    currency: string;
    overwrite?: boolean;
    revision: number;
  };
  "merchant.currencies.jobs": JsonValue;
  "merchant.currencies.job": { id: string };
  "privacy.policy": JsonValue;
  "privacy.consent": { choices: JsonValue; policyVersion: string };
  "legal.accept": {
    digitalImmediate: boolean;
    policyVersion: string;
    terms: boolean;
  };
  "legal.request": {
    email: string;
    kind: string;
    message: string;
    name: string;
    reference: string;
    requestKey: string;
  };
  "merchant.legal.requests": JsonValue;
  "merchant.legal.review": {
    id: string;
    note: string;
    revision: number;
    state: string;
  };
}
