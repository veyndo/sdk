/** One client for native and independently hosted component operations; business rules remain server-owned. */
import { transport, VeyndoError } from './transport.js';
export { VeyndoError } from './transport.js';

const mcpApps = { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: ['text/html;profile=mcp-app'] } } };

export function createClient(options) {
  const request = transport(options); const mcpPath = options.mcpPath ?? '/mcp';
  let sequence = 0; let protocolVersion;
  async function rpc(method, params = {}, callOptions = {}) {
    const id = `sdk-${++sequence}`;
    const headers = protocolVersion ? { 'MCP-Protocol-Version': protocolVersion } : {};
    const value = await request(mcpPath, { method: 'POST', body: { jsonrpc: '2.0', id, method, params },
      headers, signal: callOptions.signal });
    if (!value || typeof value !== 'object' || value.jsonrpc !== '2.0' || value.id !== id ||
        (Object.hasOwn(value, 'result') === Object.hasOwn(value, 'error')))
      throw new VeyndoError('Invalid or mismatched MCP response', { kind: 'protocol', outcomeUnknown: method === 'tools/call' });
    if (value.error) throw new VeyndoError(String(value.error.message ?? 'MCP request failed'), {
      kind: 'rpc', code: value.error.code,
      outcomeUnknown: method === 'tools/call' && ![-32700, -32600, -32601, -32602].includes(value.error.code) });
    return value.result;
  }
  async function toolResult(name, args = {}, callOptions) {
    if (typeof name !== 'string' || !name || !args || typeof args !== 'object' || Array.isArray(args))
      throw new TypeError('Tool name and object arguments are required');
    const params = { name, arguments: args };
    if (callOptions?.resourceUri !== undefined) {
      if (typeof callOptions.resourceUri !== 'string' || !callOptions.resourceUri.startsWith('ui://'))
        throw new TypeError('An MCP App resource URI must start with ui://');
      params._meta = { 'ai.veyndo/resourceUri': callOptions.resourceUri };
    }
    const result = await rpc('tools/call', params, callOptions);
    if (!result || typeof result !== 'object' || Array.isArray(result))
      throw new VeyndoError('Invalid MCP tool result', { kind: 'protocol', outcomeUnknown: true });
    return result;
  }
  return Object.freeze({
    request,
    async initialize(callOptions) {
      const requested = options.protocolVersion ?? '2025-11-25';
      const result = await rpc('initialize', { protocolVersion: requested, capabilities: options.mcpApps ? mcpApps : {},
        clientInfo: { name: '@veyndo/sdk', version: '0.4.16' } }, callOptions);
      if (!result || result.protocolVersion !== requested)
        throw new VeyndoError('Unsupported MCP protocol version returned by service', { kind: 'protocol' });
      protocolVersion = result.protocolVersion; return result;
    },
    tools: callOptions => rpc('tools/list', {}, callOptions),
    resource(uri, callOptions) {
      if (typeof uri !== 'string' || !uri)
        throw new TypeError('A resource URI is required');
      return rpc('resources/read', { uri }, callOptions);
    },
    toolResult,
    async tool(name, args = {}, callOptions) {
      const result = await toolResult(name, args, callOptions);
      if (result.isError) {
        const message = result.content?.find(item => item.type === 'text')?.text ?? 'Operation rejected';
        // An extension may fail after an external effect; error prose cannot prove rollback.
        throw new VeyndoError(message, { kind: 'tool', outcomeUnknown: true });
      }
      if (Object.hasOwn(result, 'structuredContent')) return result.structuredContent;
      const text = result.content?.find(item => item.type === 'text')?.text;
      if (text !== undefined) { try { return JSON.parse(text); } catch { return text; } }
      return result.content ?? [];
    },
  });
}
