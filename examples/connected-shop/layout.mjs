/** Generate presentation from two admitted panels. Commerce inputs never enter this contract. */
const panels = { checkout: ['Purchase', 'Guide'], guide: ['Guide', 'Purchase'] };
export const shopCatalog = 'https://www.veyndo.ai/catalogs/connected-shop/v1';
const validFocus = value => value === 'checkout' || value === 'guide';

export function layoutSource(focus) {
  return `root = Shop([${panels[focus].map(name => name + '()').join(', ')}])`;
}

export function isLayoutSource(source) {
  return Object.keys(panels).some(focus => layoutSource(focus) === source);
}

export function a2uiLayout(focus) {
  const surfaceId = 'connected-shop';
  return [
    { version: '1.0', createSurface: { surfaceId, catalogId: shopCatalog } },
    { version: '1.0', updateComponents: { surfaceId, components: [
      { id: 'root', component: 'Shop', children: panels[focus] },
      ...panels[focus].map(name => ({ id: name, component: name })),
    ] } },
  ];
}

export async function generateLayout(focus, { key, model = 'gpt-5.4-mini', fetcher = fetch } = {}) {
  if (!validFocus(focus)) throw new Error('Choose a valid layout focus');
  const fallback = { focus, generator: 'local' };
  if (!key) return fallback;
  try {
    const response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(3500),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model, store: false, max_output_tokens: 96,
        instructions: 'Order the two storefront panels according to the requested focus.',
        input: focus,
        text: { format: {
          type: 'json_schema', name: 'shop_layout', strict: true,
          schema: { type: 'object', properties: { first: { enum: ['guide', 'checkout'], type: 'string' } },
            required: ['first'], additionalProperties: false },
        } },
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return fallback;
    }
    const body = await response.json();
    const output = body.output?.flatMap(message => message.content ?? [])
      .filter(item => item.type === 'output_text');
    if (output?.length !== 1 || typeof output[0].text !== 'string' || output[0].text.length > 128)
      return fallback;
    const result = JSON.parse(output[0].text);
    if (result && Object.keys(result).length === 1 && validFocus(result.first))
      return { focus: result.first, generator: 'openai' };
  } catch {
    // Keep the normal storefront available when the presentation provider fails.
  }
  return fallback;
}
