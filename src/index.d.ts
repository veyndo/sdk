/** Operation names and inputs come from the native registry; domain response types remain explicit JSON. */
import type { OperationInputs, OperationName } from './generated/index.js';
import type { JsonValue } from './generated/value.js';
export type { OperationInputs, OperationName, JsonValue };
export interface ClientOptions {
  baseUrl: string;
  shop?: string;
  token?: string | (() => string | undefined | Promise<string | undefined>);
  mcpPath?: string;
  protocolVersion?: string;
  /** Advertise support for MCP Apps HTML resources when initializing. */
  mcpApps?: boolean;
  timeoutMs?: number;
  maxResponseBytes?: number;
  credentials?: 'omit' | 'same-origin';
  fetch?: typeof fetch;
}
export interface CallOptions { signal?: AbortSignal }
export interface ToolResultOptions extends CallOptions { resourceUri?: string }
export interface McpToolResult {
  content?: Array<{ type: string; [key: string]: JsonValue }>;
  structuredContent?: JsonValue;
  isError?: boolean;
  [key: string]: JsonValue | undefined;
}
export interface McpResource {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
  _meta?: Record<string, JsonValue>;
}
export interface RequestOptions extends CallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  body?: JsonValue;
  headers?: HeadersInit;
}
export interface Client<Inputs extends object = OperationInputs> {
  request(path: string, options?: RequestOptions): Promise<JsonValue>;
  initialize(options?: CallOptions): Promise<JsonValue>;
  tools(options?: CallOptions): Promise<{ tools: Array<{ name: string; [key: string]: unknown }> }>;
  resource(uri: string, options?: CallOptions): Promise<{ contents: McpResource[] }>;
  /** Keep the complete MCP result for a host rendering its linked app view. */
  toolResult<N extends keyof Inputs & string>(name: N, args: Inputs[N], options?: ToolResultOptions): Promise<McpToolResult>;
  toolResult(name: `app.${string}`, args?: Record<string, JsonValue>, options?: ToolResultOptions): Promise<McpToolResult>;
  tool<N extends keyof Inputs & string>(name: N, args: Inputs[N], options?: CallOptions): Promise<JsonValue>;
  /** Third-party component operations still require server-side authorization and schema validation. */
  tool(name: `app.${string}`, args?: Record<string, JsonValue>, options?: CallOptions): Promise<JsonValue>;
}
export class VeyndoError extends Error {
  kind?: 'http' | 'rpc' | 'tool' | 'network' | 'timeout' | 'aborted' | 'protocol';
  status?: number;
  code?: number | string;
  outcomeUnknown: boolean;
}
export function createClient<Inputs extends object = OperationInputs>(options: ClientOptions): Client<Inputs>;
