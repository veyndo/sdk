/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs3 {
  "automation.catalog": JsonValue;
  "automation.list": JsonValue;
  "automation.save": {
    data: JsonValue;
    id: string;
    kind: "rules" | "flows" | "promotions" | "channels";
    revision: number;
  };
  "automation.dependencies": {
    id: string;
    kind: "rules" | "flows" | "promotions" | "channels";
  };
  "automation.delete": {
    id: string;
    kind: "rules" | "flows" | "promotions" | "channels";
    revision: number;
  };
  "automation.preview": { condition: JsonValue };
  "automation.import": { condition: JsonValue };
  "merchant.workflow": JsonValue;
  "merchant.workflow.save": { data: JsonValue; revision: number };
  "merchant.product.content": { id: string };
  "merchant.product.save": { id: string; product: JsonValue };
  "merchant.product.assets": { id: string };
}
