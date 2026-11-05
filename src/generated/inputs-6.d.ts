/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs6 {
  "knowledge.external": { query?: string };
  "knowledge.product": { id?: string };
  "knowledge.workspace": {
    after?: string;
    archived?: boolean;
    kind?: string;
    query?: string;
  };
  "knowledge.preview": {
    audience?: "customer" | "merchant";
    productId?: string;
    query?: string;
  };
  "knowledge.source.detail": { id?: string };
  "knowledge.source.create": {
    content?: string;
    id?: string;
    kind?:
      | "document"
      | "datasheet"
      | "manual"
      | "care"
      | "faq"
      | "shipping"
      | "returns"
      | "warranty"
      | "brand"
      | "guidance";
    locale?: string;
    productId?: string | null;
    revision?: number;
    title?: string;
    translations?: JsonValue;
  };
  "knowledge.source.edit": {
    content?: string;
    id?: string;
    kind?:
      | "document"
      | "datasheet"
      | "manual"
      | "care"
      | "faq"
      | "shipping"
      | "returns"
      | "warranty"
      | "brand"
      | "guidance";
    locale?: string;
    productId?: string | null;
    revision?: number;
    title?: string;
    translations?: JsonValue;
  };
  "knowledge.source.visibility": {
    approve?: boolean;
    id?: string;
    revision?: number;
    visibility?: "private" | "public";
  };
  "knowledge.source.archive": {
    approve?: boolean;
    archived?: boolean;
    id?: string;
    revision?: number;
  };
  "cart.create": { session?: string };
  "cart.replace": {
    items: Array<{
      id: string;
      quantity: number;
      [key: string]: JsonValue | undefined;
    }>;
    revision: number;
  };
  "cart.quote": JsonValue;
}
