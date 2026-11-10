/** Standalone Knowledge v1 HTTP types. The server validates all source and identity data. */
import type { CallOptions, ClientOptions } from './index.js';

export interface KnowledgeOptions extends Pick<ClientOptions, 'baseUrl' | 'token' | 'timeoutMs' | 'maxResponseBytes' | 'fetch'> {
  /** Exact tenant ID expected in the current access token. */
  expectedTenant: string;
  token: NonNullable<ClientOptions['token']>;
}

export interface SourceNode {
  id: string;
  revision: number;
  title: string;
  locale: string;
}
export interface SourceSummary extends SourceNode {
  contentHash: string;
  withdrawn: boolean;
}
export interface SourcePage {
  sources: SourceSummary[];
  nextCursor: string | null;
}
export interface ProductRelationships {
  parentId?: string | null;
  crossSellingIds?: string[];
}
export interface SourceWrite extends SourceNode {
  content: string;
  translations?: Record<string, { title?: string | null; content?: string | null }>;
}
export interface SourceSearch {
  query: string;
  locale: string;
  mainLocale: string;
}
export interface SourceGraphQuery {
  id: string;
  locale: string;
  mainLocale: string;
  limit?: number;
}

interface Evidence {
  sourceId: string;
  documentId: string;
  title: string;
  locale: string;
  contentHash: string;
  revision: number;
  text: string;
}
export interface DocumentEvidence extends Evidence {
  association: 'shop';
  sourceType: 'text';
  productId: null;
  appliesToProductId: null;
}
export interface ProductEvidence extends Evidence {
  association: 'product';
  sourceType: 'catalog-product';
  productId: string;
  appliesToProductId: string | null;
}
interface Edge {
  sourceId: string;
  sourceRevision: number;
  targetId: string;
  targetRevision: number;
  related: SourceNode;
}
export interface DocumentGraph {
  document: SourceNode;
  hasMore: boolean;
  edges: Array<Edge & { kind: 'references'; provenance: 'document' }>;
}
export interface ProductGraph {
  product: SourceNode;
  hasMore: boolean;
  edges: Array<Edge & { kind: 'variant_of' | 'cross_sells'; provenance: 'catalog' }>;
}
interface SourceClient<Details, Write, Query, Match, Graph> {
  read(input: { id: string }, options?: CallOptions): Promise<Details>;
  list(input?: { after?: string; limit?: number }, options?: CallOptions): Promise<SourcePage>;
  put(input: Write, options?: CallOptions): Promise<Details>;
  withdraw(input: { id: string; revision: number }, options?: CallOptions): Promise<Details>;
  search(input: Query, options?: CallOptions): Promise<{ sources: Match[] }>;
  current(input: { sources: Match[] }, options?: CallOptions): Promise<{ current: boolean }>;
  graph(input: SourceGraphQuery, options?: CallOptions): Promise<Graph>;
}

export interface KnowledgeClient {
  documents: SourceClient<
    SourceSummary & { references: string[] }, SourceWrite & { references?: string[] },
    SourceSearch, DocumentEvidence, DocumentGraph
  >;
  products: SourceClient<
    SourceSummary & { relationships: ProductRelationships }, SourceWrite & { relationships?: ProductRelationships },
    SourceSearch & { productId?: string }, ProductEvidence, ProductGraph
  >;
}
export function createKnowledgeClient(options: KnowledgeOptions): KnowledgeClient;
