/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs9 {
  "knowledge.experiments": JsonValue;
  "knowledge.experiment.create": { approve?: boolean; design?: JsonValue };
  "knowledge.experiment.start": {
    approve?: boolean;
    id?: string;
    revision?: number;
  };
  "knowledge.experiment.stop": {
    approve?: boolean;
    id?: string;
    revision?: number;
  };
  "knowledge.experiment.finish": {
    approve?: boolean;
    id?: string;
    revision?: number;
  };
  "knowledge.experiment.report": { id?: string };
  "catalog.facts": { productId?: string };
  "knowledge.autonomy.apply": { taskId?: string };
  "knowledge.claims": { productId?: string };
  "knowledge.claim.propose": {
    confidence?: number;
    contentHash?: string;
    locale?: string;
    nodeType?:
      | "product"
      | "variant"
      | "material"
      | "property"
      | "intent"
      | "problem"
      | "occasion"
      | "audience"
      | "claim"
      | "return_reason"
      | "supplier"
      | "policy"
      | "document"
      | "support";
    productId?: string;
    quote?: string;
    sourceId?: string;
    text?: string;
  };
  "knowledge.claim.review": {
    approve?: boolean;
    id?: string;
    revision?: number;
    state?: "evidenced" | "confirmed" | "rejected";
  };
  "knowledge.extract": {
    inference?: JsonValue;
    locale?: string;
    productId?: string;
    sourceId?: string;
  };
}
