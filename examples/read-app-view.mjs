/** Discover and inspect an installed public MCP App without opening its HTML. */
import { createClient } from '../src/index.js';

const mime = 'text/html;profile=mcp-app';
const tool = process.argv[2] ?? 'app.example_agent_results.list_entries';
const client = createClient({
  baseUrl: process.env.VEYNDO_URL ?? 'http://127.0.0.1:8787',
  shop: process.env.VEYNDO_SHOP,
  mcpApps: true,
});
const hello = await client.initialize();
if (!Object.hasOwn(hello.capabilities?.extensions ?? {}, 'io.modelcontextprotocol/ui'))
  throw new Error('This service did not negotiate MCP Apps.');

const discovered = (await client.tools()).tools.find(entry => entry.name === tool);
const uri = discovered?._meta?.ui?.resourceUri;
if (typeof uri !== 'string') throw new Error('Install the public app view in the test shop first.');
const resource = (await client.resource(uri)).contents.find(content => content.uri === uri && content.mimeType === mime);
if (typeof resource?.text !== 'string') throw new Error('The expected MCP App HTML is unavailable.');
const result = await client.toolResult(tool, { limit: 1 }, { resourceUri: uri });
if (result.isError) throw new Error('The public app list operation failed.');
console.log(JSON.stringify({ tool, uri, mimeType: mime, returnedRows: result.structuredContent?.elements?.length }, null, 2));
