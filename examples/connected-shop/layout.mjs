/** Generate presentation from two admitted panels. Commerce inputs never enter this contract. */
import { createA2uiAdapter } from '../../src/a2ui.js';
import { createLayoutRegistry } from '../../src/composition.js';

const panels = { checkout: ['Purchase', 'Guide'], guide: ['Guide', 'Purchase'] };
export const shopCatalog = 'https://www.veyndo.ai/catalogs/connected-shop/v1';
const shopViews = ['Purchase', 'Guide'].map(id => ({ id, title: id, version: 1 }));
const registry = createLayoutRegistry(shopViews);
const adapter = createA2uiAdapter({ catalogId: shopCatalog, rootComponent: 'Shop',
  views: shopViews.map(({ id, version }) => ({ view: id, version, component: id })),
});
const validFocus = value => value === 'checkout' || value === 'guide';

export function layoutSource(focus) {
  return `root = Shop([${panels[focus].map(name => name + '()').join(', ')}])`;
}

export function isLayoutSource(source) {
  return Object.keys(panels).some(focus => layoutSource(focus) === source);
}

export function a2uiLayout(focus) {
  const definition = { version: 1, panels: panels[focus].map(id => ({ id, view: id, version: 1 })) };
  const projection = adapter.project(registry, definition, {
    surfaceId: 'connected-shop', capabilities: { '1.0': { supportedCatalogIds: [shopCatalog] } },
  });
  if (projection.kind !== 'a2ui') throw new Error('Connected Shop layout is unavailable');
  return projection.messages;
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
