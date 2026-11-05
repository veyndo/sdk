/** Inputs generated from the canonical versioned host exchange contract; host domain checks remain authoritative. */
import type { ClientOptions, CallOptions, JsonValue } from './index.js';
import type { HostInputs } from './generated/host-inputs.js';
export type { HostInputs } from './generated/host-inputs.js';
export interface HostOptions extends ClientOptions { appId: string; hostPath?: string }
export function createHostClient(options: HostOptions): {
  call<N extends keyof HostInputs>(operation: N, input: HostInputs[N], options?: CallOptions): Promise<JsonValue>;
};
