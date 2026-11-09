/** Check a native Flow definition against the connected shop before saving it. */
import { readFile } from 'node:fs/promises';
import { createClient } from '../src/index.js';

const [file, id, rawRevision = '0'] = process.argv.slice(2);
const { VEYNDO_URL: baseUrl, VEYNDO_SHOP: shop, VEYNDO_TOKEN: token } = process.env;
const revision = Number(rawRevision);
if (!file || !id || !Number.isSafeInteger(revision) || revision < 0 || !baseUrl || !shop || !token) {
  throw new Error('Set VEYNDO_URL, VEYNDO_SHOP and VEYNDO_TOKEN, then pass <draft.json> <flow-id> [revision].');
}

const client = createClient({ baseUrl, shop, token });
const data = JSON.parse(await readFile(file, 'utf8'));
const result = await client.tool('automation.validate_flow', {
  id,
  revision,
  data,
});
console.log(JSON.stringify(result, null, 2));
