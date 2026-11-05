/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs16 {
  "b2b.company": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "b2b.company.save": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "b2b.unit.save": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "b2b.member.save": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "b2b.contexts": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "b2b.select": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "b2b.approval.request": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "b2b.approvals": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "b2b.approval.decide": {
    cartRevision?: number;
    companyId?: string;
    customerId?: string;
    data?: JsonValue;
    id?: string;
    lines?: Array<{ quantity: number; sku: string }>;
    message?: string;
    parentId?: string | null;
    productIds?: Array<string>;
    purchaseOrder?: string;
    revision?: number;
    state?: "approved" | "rejected";
    unitId?: string;
  };
  "automation.compare_history": {
    condition: JsonValue;
    flowId: string;
    limit: number;
    revision: number;
    ruleId: string;
  };
}
