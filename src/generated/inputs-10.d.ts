/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs10 {
  "knowledge.compile": {
    claims?: Array<{ id: string; text: string }>;
    productId?: string;
  };
  "checkout.payment.methods": JsonValue;
  "checkout.payment.method.revoke": {
    approve: boolean;
    id: string;
    requestKey: string;
  };
  "checkout.payment.instructions": { id: string };
  "merchant.payment.instructions": { id: string };
  "merchant.payment": {
    amountMinor?: number;
    approve: boolean;
    captureId?: string;
    finalCapture?: boolean;
    id: string;
    operation:
      "capture" | "authorize" | "void" | "refund" | "reconcile" | "cancel";
    requestKey: string;
  };
  "merchant.payment.details": { id: string };
  "merchant.payment.providers": JsonValue;
  "merchant.payment.onboarding": {
    approve?: boolean;
    channel?: string;
    country?: string;
    environment?: "sandbox" | "live" | "simulation" | "contract-fixture";
    id?: string;
    operation?: "start" | "status" | "disconnect";
    requestKey?: string;
  };
  "merchant.app.history": {
    app: string;
    approve?: boolean;
    entity: string;
    id: string;
    revision?: number;
    version?: number;
  };
  "merchant.app.restore": {
    app: string;
    approve: boolean;
    entity: string;
    id: string;
    revision: number;
    version: number;
  };
  "merchant.site.task": {
    agent?: "codex" | "claude_code";
    id: string;
    instruction: string;
    revision: number;
    selected?: string;
  };
}
