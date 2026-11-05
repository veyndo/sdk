/** Versioned, server-side host exchange. Authority and domain effects remain with the configured host. */
import { createClient } from './index.js';
import { operations } from './generated/host-operations.js';
export function createHostClient(options) {
  const { appId, hostPath = `/api/apps/${appId}/core/` } = options;
  if (typeof appId !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,99}$/.test(appId))
    throw new TypeError('A bounded application ID is required');
  if (typeof hostPath !== 'string' || !/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(hostPath) || hostPath.length > 200)
    throw new TypeError('hostPath must be a fixed absolute path ending in a slash');
  const client = createClient(options);
  return Object.freeze({
    call(operation, input, callOptions = {}) {
      if (!operations.includes(operation)) throw new TypeError('Unknown host exchange operation');
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Object input required');
      return client.request(hostPath + operation, { method: 'POST', body: input,
        headers: { 'x-veyndo-host-version': '1' }, signal: callOptions.signal });
    },
  });
}
