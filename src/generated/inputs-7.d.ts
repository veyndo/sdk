/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs7 {
  "checkout.complete": { idempotency_key: string };
  "merchant.plan": { instruction: string };
  "merchant.apply": { approve: boolean; task_id: string };
  "merchant.orders": {
    after?: string;
    appFilter?: string;
    channelId?: string;
    customer?: string;
    deliveryState?: string;
    direction?: "asc" | "desc";
    from?: string;
    limit?: number;
    paymentState?: string;
    query?: string;
    sort?: "created" | "number" | "customer" | "total" | "state";
    state?: string;
    to?: string;
  };
  "merchant.media.caption": {
    alt?: string;
    caption?: string;
    context: string;
    imageUrl?: string;
    locale: string;
  };
  "merchant.run.create": {
    approve?: boolean;
    id?: string;
    inference?: {
      model?: string | null;
      provider: "platform" | "ollama" | "openai" | "anthropic";
    };
    instruction: string;
    requestId?: string;
    revision?: number;
    workspaceContext?: {
      selected?: {
        id: string;
        kind:
          | "product"
          | "order"
          | "customer"
          | "company"
          | "app"
          | "page"
          | "flow";
      };
      view:
        | "assistant"
        | "workspace"
        | "setup"
        | "overview"
        | "knowledge"
        | "agents"
        | "commerce"
        | "design"
        | "productData"
        | "products"
        | "orders"
        | "customers"
        | "b2b"
        | "pos"
        | "storyfronts"
        | "channels"
        | "automation"
        | "apps"
        | "developers"
        | "environments"
        | "users";
    };
  };
  "merchant.run.status": {
    approve?: boolean;
    id: string;
    inference?: {
      model?: string | null;
      provider: "platform" | "ollama" | "openai" | "anthropic";
    };
    instruction?: string;
    requestId?: string;
    revision?: number;
    workspaceContext?: {
      selected?: {
        id: string;
        kind:
          | "product"
          | "order"
          | "customer"
          | "company"
          | "app"
          | "page"
          | "flow";
      };
      view:
        | "assistant"
        | "workspace"
        | "setup"
        | "overview"
        | "knowledge"
        | "agents"
        | "commerce"
        | "design"
        | "productData"
        | "products"
        | "orders"
        | "customers"
        | "b2b"
        | "pos"
        | "storyfronts"
        | "channels"
        | "automation"
        | "apps"
        | "developers"
        | "environments"
        | "users";
    };
  };
  "merchant.run.cancel": {
    approve: boolean;
    id: string;
    inference?: {
      model?: string | null;
      provider: "platform" | "ollama" | "openai" | "anthropic";
    };
    instruction?: string;
    requestId?: string;
    revision: number;
    workspaceContext?: {
      selected?: {
        id: string;
        kind:
          | "product"
          | "order"
          | "customer"
          | "company"
          | "app"
          | "page"
          | "flow";
      };
      view:
        | "assistant"
        | "workspace"
        | "setup"
        | "overview"
        | "knowledge"
        | "agents"
        | "commerce"
        | "design"
        | "productData"
        | "products"
        | "orders"
        | "customers"
        | "b2b"
        | "pos"
        | "storyfronts"
        | "channels"
        | "automation"
        | "apps"
        | "developers"
        | "environments"
        | "users";
    };
  };
  "merchant.run.resume": {
    approve: boolean;
    id: string;
    inference?: {
      model?: string | null;
      provider: "platform" | "ollama" | "openai" | "anthropic";
    };
    instruction?: string;
    requestId?: string;
    revision: number;
    workspaceContext?: {
      selected?: {
        id: string;
        kind:
          | "product"
          | "order"
          | "customer"
          | "company"
          | "app"
          | "page"
          | "flow";
      };
      view:
        | "assistant"
        | "workspace"
        | "setup"
        | "overview"
        | "knowledge"
        | "agents"
        | "commerce"
        | "design"
        | "productData"
        | "products"
        | "orders"
        | "customers"
        | "b2b"
        | "pos"
        | "storyfronts"
        | "channels"
        | "automation"
        | "apps"
        | "developers"
        | "environments"
        | "users";
    };
  };
  "merchant.scenario.create": {
    inference?: {
      model?: string | null;
      provider: "platform" | "ollama" | "openai" | "anthropic";
    };
    instruction: string;
    profiles: Array<{
      budgetMinor: number;
      country: string;
      goal: string;
      id: string;
      locale: string;
      name: string;
    }>;
    requestId: string;
    sourceTaskId?: string;
    title: string;
  };
  "merchant.scenario.status": { id: string };
  "merchant.scenario.list": JsonValue;
}
