/** Discover the installed public guide and keep every follow-up tied to one product. */
const toolName = 'app.example_agent_results.list_entries';
const mimeType = 'text/html;profile=mcp-app';

export async function discoverGuide(client, productId) {
  const hello = await client.initialize();
  if (!hello.capabilities?.extensions?.['io.modelcontextprotocol/ui'])
    throw new Error('MCP Apps capability is missing');
  const { tools } = await client.tools();
  const uri = tools.find(tool => tool.name === toolName)?._meta?.ui?.resourceUri;
  if (typeof uri !== 'string' || !uri.startsWith('ui://'))
    throw new Error('Install the Product Guide in the example shop');
  const { contents } = await client.resource(uri);
  const resource = contents.find(item => item.uri === uri && item.mimeType === mimeType);
  const definition = resource?._meta?.['ai.veyndo/definition'];
  if (typeof resource?.text !== 'string' || definition?.toolName !== toolName ||
      definition.productReference !== 'product_id' || definition.filter?.name !== 'segment' ||
      !Array.isArray(definition.filter.choices))
    throw new Error('The installed guide has an unexpected contract');

  const segments = new Set(definition.filter.choices.map(choice => choice.value));
  const original = { filter: { product_id: productId }, limit: 8 };
  return {
    original, definition, html: resource.text,
    async read(state, selection = {}) {
      const { segment, after } = selection;
      if ((segment !== undefined && !segments.has(segment)) ||
          (after !== undefined && (typeof after !== 'string' || !after ||
            state.guide?.segment !== segment || state.guide.after !== after)))
        throw new Error('This filter or page is not available for the guide');
      const filter = { ...original.filter };
      if (segment !== undefined) filter.segment = segment;
      const args = { ...original, filter };
      if (after !== undefined) args.after = after;
      const result = await client.toolResult(toolName, args, { resourceUri: uri });
      if (result.isError || !Array.isArray(result.structuredContent?.elements))
        throw new Error('Core rejected the guide request');
      state.guide = { segment, after: result.structuredContent.nextCursor };
      return result;
    },
  };
}
