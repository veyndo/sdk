/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs8 {
  "merchant.apps.search": { after?: string; limit?: number; query?: string };
  "merchant.apps.read": { action: string; app: string; arguments: JsonValue };
  "merchant.agents.status": JsonValue;
  "merchant.agents.control": {
    approve: true;
    revision: number;
    stopped: boolean;
  };
  "merchant.grid.plan": {
    entity: "orders" | "products" | "customers";
    instruction: string;
    locale: string;
  };
  "merchant.customer.lookup": {
    after?: string;
    limit?: number;
    query?: string;
  };
  "team.roles": {
    approve?: boolean;
    data?: {
      active: boolean;
      name: JsonValue;
      permissions: Array<
        | "overview.read"
        | "assistant.use"
        | "automation.read"
        | "automation.manage"
        | "channels.read"
        | "channels.manage"
        | "developer.read"
        | "developer.manage"
        | "environments.read"
        | "environments.manage"
        | "knowledge.write"
        | "ai.manage"
        | "apps.read"
        | "pos.use"
        | "b2b.read"
        | "b2b.manage"
        | "catalog.read"
        | "catalog.write"
        | "orders.read"
        | "orders.write"
        | "customers.read"
        | "customers.pii"
        | "customers.write"
        | "documents.read"
        | "documents.create"
        | "payments.read"
        | "payments.manage"
        | "team.manage"
        | "settings.read"
        | "settings.write"
        | "apps.manage"
        | "knowledge.read"
      >;
    };
    id?: string;
    revision?: number;
  };
  "team.role.save": {
    approve?: boolean;
    data?: {
      active: boolean;
      name: JsonValue;
      permissions: Array<
        | "overview.read"
        | "assistant.use"
        | "automation.read"
        | "automation.manage"
        | "channels.read"
        | "channels.manage"
        | "developer.read"
        | "developer.manage"
        | "environments.read"
        | "environments.manage"
        | "knowledge.write"
        | "ai.manage"
        | "apps.read"
        | "pos.use"
        | "b2b.read"
        | "b2b.manage"
        | "catalog.read"
        | "catalog.write"
        | "orders.read"
        | "orders.write"
        | "customers.read"
        | "customers.pii"
        | "customers.write"
        | "documents.read"
        | "documents.create"
        | "payments.read"
        | "payments.manage"
        | "team.manage"
        | "settings.read"
        | "settings.write"
        | "apps.manage"
        | "knowledge.read"
      >;
    };
    id?: string;
    revision?: number;
  };
  "team.role.dependencies": {
    approve?: boolean;
    data?: {
      active: boolean;
      name: JsonValue;
      permissions: Array<
        | "overview.read"
        | "assistant.use"
        | "automation.read"
        | "automation.manage"
        | "channels.read"
        | "channels.manage"
        | "developer.read"
        | "developer.manage"
        | "environments.read"
        | "environments.manage"
        | "knowledge.write"
        | "ai.manage"
        | "apps.read"
        | "pos.use"
        | "b2b.read"
        | "b2b.manage"
        | "catalog.read"
        | "catalog.write"
        | "orders.read"
        | "orders.write"
        | "customers.read"
        | "customers.pii"
        | "customers.write"
        | "documents.read"
        | "documents.create"
        | "payments.read"
        | "payments.manage"
        | "team.manage"
        | "settings.read"
        | "settings.write"
        | "apps.manage"
        | "knowledge.read"
      >;
    };
    id?: string;
    revision?: number;
  };
  "team.role.delete": {
    approve?: boolean;
    data?: {
      active: boolean;
      name: JsonValue;
      permissions: Array<
        | "overview.read"
        | "assistant.use"
        | "automation.read"
        | "automation.manage"
        | "channels.read"
        | "channels.manage"
        | "developer.read"
        | "developer.manage"
        | "environments.read"
        | "environments.manage"
        | "knowledge.write"
        | "ai.manage"
        | "apps.read"
        | "pos.use"
        | "b2b.read"
        | "b2b.manage"
        | "catalog.read"
        | "catalog.write"
        | "orders.read"
        | "orders.write"
        | "customers.read"
        | "customers.pii"
        | "customers.write"
        | "documents.read"
        | "documents.create"
        | "payments.read"
        | "payments.manage"
        | "team.manage"
        | "settings.read"
        | "settings.write"
        | "apps.manage"
        | "knowledge.read"
      >;
    };
    id?: string;
    revision?: number;
  };
  "knowledge.behavior": { days?: number; salesChannelId?: string };
  "knowledge.behavior.journey": { session?: string };
}
