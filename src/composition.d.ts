/** A shared UI layout, not authority, a domain executor or arbitrary generated JavaScript. */
import type { JsonValue, CallOptions } from './index.js';
export interface RegisteredView { id: string; version: number; title: string }
export interface WorkspacePanel { id: string; view: string; version: number; input?: Record<string, JsonValue> }
export interface WorkspaceDefinition { version: 1; panels: WorkspacePanel[] }
export interface LayoutRegistry {
  catalogue(): RegisteredView[];
  admit(candidate: unknown): WorkspaceDefinition | null;
}
export function createLayoutRegistry(views: RegisteredView[]): LayoutRegistry;
export interface ServiceClient {
  tools(options?: CallOptions): Promise<{ tools: Array<{ name: string; annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean } }>; nextCursor?: string }>;
  tool(name: string, args: Record<string, JsonValue>, options?: CallOptions): Promise<JsonValue>;
}
export interface ServiceBinding { id: string; client: ServiceClient }
export interface ViewBinding extends RegisteredView {
  service: string;
  operation: string;
  effect: 'read';
  arguments(input: Record<string, JsonValue>, context: JsonValue): Record<string, JsonValue>;
}
export interface Composition {
  setContext(context: JsonValue): void;
  dispose(): void;
  discover(options?: CallOptions): Promise<{ services: Array<{ id: string; state: 'ready' | 'unavailable' }>; views: RegisteredView[] }>;
  catalogue(): { version: 1; views: RegisteredView[] };
  admit(candidate: unknown): WorkspaceDefinition | null;
  read(candidate: unknown, panelId: string, options?: CallOptions): Promise<{ panel: string; service: string; operation: string; data: JsonValue }>;
}
export function createComposition(options: { services: ServiceBinding[]; views: ViewBinding[]; context: JsonValue }): Composition;
export class CompositionError extends Error { code: string }
