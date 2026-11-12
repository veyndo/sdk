import type { LayoutRegistry, WorkspacePanel } from './composition.js';

export type RendererCapabilities = Readonly<Record<string, {
  readonly supportedCatalogIds?: readonly string[];
}>>;

export type A2uiLayoutMessage =
  | { version: '1.0'; createSurface: { surfaceId: string; catalogId: string } }
  | { version: '1.0'; updateComponents: { surfaceId: string; components: Array<{
      id: string; component: string; children?: string[];
    }> } };

type PanelReference = Pick<WorkspacePanel, 'id' | 'view' | 'version'>;
export type A2uiProjection =
  | { kind: 'rejected' }
  | { kind: 'structured'; reason: 'unsupported_catalog' | 'unsupported_view'; panels: PanelReference[] }
  | { kind: 'a2ui'; panels: PanelReference[]; messages: A2uiLayoutMessage[] };

export function createA2uiAdapter(options: {
  catalogId: string;
  rootComponent?: string;
  views: ReadonlyArray<{ view: string; version: number; component: string }>;
}): {
  project(workspace: Pick<LayoutRegistry, 'admit'>, candidate: unknown, options: {
    surfaceId: string; capabilities?: RendererCapabilities;
  }): A2uiProjection;
};
