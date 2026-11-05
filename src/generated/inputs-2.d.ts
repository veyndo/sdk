/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value.js";
export interface Inputs2 {
  "merchant.commerce.read": {
    afterProductId?: string;
    area?: "aiPolicy";
    channelId?: string;
  };
  "merchant.commerce.save": {
    baseRevision?: number;
    channelId?: string;
    data: JsonValue;
    revision: number;
  };
  "merchant.translations.list": JsonValue;
  "merchant.translations.create": {
    inference?: {
      model?: string | null;
      provider?: "platform" | "ollama" | "openai" | "anthropic";
    };
    overwrite?: boolean;
    productIds?: Array<string>;
    targetLocale: string;
  };
  "merchant.translations.detail": { cursor?: string; id: string };
  "merchant.translations.control": { action: "resume" | "cancel"; id: string };
  "merchant.translations.apply": { id: string; productId?: string };
  "merchant.products": {
    active?: boolean;
    after?: string;
    appFilter?: string;
    categoryId?: string;
    direction?: "asc" | "desc";
    limit?: number;
    lowStock?: boolean;
    parentId?: string;
    preparation?: boolean;
    search?: string;
    sort?: "id" | "name" | "number" | "price" | "stock";
  };
  "merchant.product.create": { product: JsonValue };
  "merchant.categories": JsonValue;
  "merchant.category.create": {
    category: {
      data: {
        active: boolean;
        translations: JsonValue;
        type: "page" | "folder" | "structuring" | "link";
        visible: boolean;
        [key: string]: JsonValue | undefined;
      };
      id?: string;
      parentId?: string | null;
      position: number;
      revision?: number;
    };
  };
  "merchant.category.save": {
    category: {
      data: {
        active: boolean;
        translations: JsonValue;
        type: "page" | "folder" | "structuring" | "link";
        visible: boolean;
        [key: string]: JsonValue | undefined;
      };
      parentId?: string | null;
      position: number;
      revision: number;
    };
    id: string;
  };
}
