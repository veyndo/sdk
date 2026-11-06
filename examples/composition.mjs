/** Compose your configured services. Bindings are trusted host code; only layout JSON may come from an agent. */
import { createClient } from '../src/index.js';
import { createComposition } from '../src/composition.js';
if (!process.env.VEYNDO_URL || !process.env.VEYNDO_SECOND_URL || !process.env.VEYNDO_SECOND_READ_TOOL)
  throw new Error('Set VEYNDO_URL, VEYNDO_SECOND_URL and the documented VEYNDO_SECOND_READ_TOOL');
const composition = createComposition({
  services: [
    { id: 'commerce', client: createClient({ baseUrl: process.env.VEYNDO_URL, shop: process.env.VEYNDO_SHOP, token: () => process.env.VEYNDO_TOKEN }) },
    { id: 'second', client: createClient({ baseUrl: process.env.VEYNDO_SECOND_URL, token: () => process.env.VEYNDO_SECOND_TOKEN }) },
  ],
  context: { shop: process.env.VEYNDO_SHOP ?? '', environment: 'live', locale: 'de-DE' },
  views: [
    { id: 'commerce.products', version: 1, title: 'Products', service: 'commerce', operation: 'catalog.search', effect: 'read', arguments: input => ({ query: input.query ?? '' }) },
    { id: 'second.read', version: 1, title: 'Independent component', service: 'second', operation: process.env.VEYNDO_SECOND_READ_TOOL, effect: 'read', arguments: () => JSON.parse(process.env.VEYNDO_SECOND_READ_INPUT ?? '{}') },
  ],
});
const discovery = await composition.discover();
console.log(JSON.stringify(discovery, null, 2));
const candidate = { version: 1, panels: discovery.views.map(v => ({ id: v.id, view: v.id, version: v.version, input: {} })) };
if (!composition.admit(candidate)) throw new Error('No compatible authorized views are available');
for (const panel of candidate.panels) console.log(JSON.stringify(await composition.read(candidate, panel.id), null, 2));
composition.dispose();
