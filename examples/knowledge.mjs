// Run on your backend with an access token scoped to the selected source and operation.
import { readFile } from 'node:fs/promises';
import { createKnowledgeClient } from '@veyndo/sdk/knowledge';

const [kind, operation, ...args] = process.argv.slice(2);
const usage = 'Use knowledge.mjs <products|documents> put <file> | search <query> <locale> <mainLocale> | list [limit] [after] | withdraw <id> <revision>';
if (!['products', 'documents'].includes(kind)) throw new Error(usage);

const knowledge = createKnowledgeClient({
  baseUrl: process.env.KNOWLEDGE_URL,
  expectedTenant: process.env.KNOWLEDGE_TENANT,
  token: () => process.env.KNOWLEDGE_ACCESS_TOKEN,
});
const source = knowledge[kind];

let result;
if (operation === 'put' && args.length === 1) {
  result = await source.put(JSON.parse(await readFile(args[0], 'utf8')));
} else if (operation === 'search' && args.length === 3) {
  const [query, locale, mainLocale] = args;
  result = await source.search({ query, locale, mainLocale });
  if (result.sources.length && !(await source.current(result)).current)
    throw new Error('Source evidence changed during the search. Search again.');
} else if (operation === 'list' && args.length <= 2) {
  const [limit = '25', after] = args;
  result = await source.list({ limit: Number(limit), ...(after ? { after } : {}) });
} else if (operation === 'withdraw' && args.length === 2) {
  const [id, revision] = args;
  result = await source.withdraw({ id, revision: Number(revision) });
} else {
  throw new Error(usage);
}
console.log(JSON.stringify(result));
