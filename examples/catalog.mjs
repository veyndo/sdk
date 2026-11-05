/** Run against your own shop; credentials are read from the process, never committed or printed. */
import { createClient } from '../src/index.js';
const client = createClient({ baseUrl: process.env.VEYNDO_URL ?? 'http://127.0.0.1:8787',
  shop: process.env.VEYNDO_SHOP, token: () => process.env.VEYNDO_TOKEN });
await client.initialize();
const result = await client.tool('catalog.search', { query: process.argv[2] ?? 'chair' });
console.log(JSON.stringify(result, null, 2));
