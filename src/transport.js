/** Bounded HTTP transport. Authority is configured once; redirects and automatic retries are forbidden. */
import { buyerSessionHeaders } from './buyer-session.js';

export class VeyndoError extends Error {
  constructor(message, { kind, status, code, outcomeUnknown = false, cause } = {}) {
    super(message, { cause }); this.name = 'VeyndoError';
    Object.assign(this, { kind, status, code, outcomeUnknown });
  }
}

export function endpoint(baseUrl, path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\\#]/.test(path))
    throw new TypeError('API path must be an absolute path on the configured origin');
  let decoded;
  try { decoded = decodeURIComponent(path.split('?')[0]); }
  catch { throw new TypeError('Invalid API path encoding'); }
  if (decoded.includes('\\') || decoded.includes('//') || decoded.split('/').some(p => p === '..' || p === '.'))
    throw new TypeError('API path traversal is not allowed');
  const url = new URL(path, baseUrl);
  if (url.origin !== baseUrl.origin) throw new TypeError('API path changes origin');
  return url;
}

async function responseBytes(response, limit) {
  const reader = response.body?.getReader();
  if (!reader) throw new VeyndoError('Server returned an empty response', { kind: 'protocol' });
  let length = 0; const chunks = [];
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length;
      if (length > limit) throw new VeyndoError('Server response exceeds the configured size limit', { kind: 'protocol' });
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const data = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return data;
}

function jsonBody(data) {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)); }
  catch (cause) { throw new VeyndoError('Server returned invalid JSON', { kind: 'protocol', cause }); }
}

export function transport(options, { readOnly = false, responseLimit = 16 * 1024 * 1024, buyerSession = false } = {}) {
  const baseUrl = new URL(options.baseUrl);
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(baseUrl.hostname);
  if (!(baseUrl.protocol === 'https:' || (baseUrl.protocol === 'http:' && loopback)) ||
      baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash || baseUrl.pathname !== '/')
    throw new TypeError('baseUrl must be an HTTPS origin (HTTP is allowed only on loopback)');
  const timeoutMs = options.timeoutMs ?? 30000;
  const maxResponseBytes = options.maxResponseBytes ?? 1048576;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000)
    throw new TypeError('timeoutMs must be between 1 and 300000');
  if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > responseLimit)
    throw new TypeError(`maxResponseBytes must be between 1 and ${responseLimit}`);
  if (!['omit', 'same-origin'].includes(options.credentials ?? 'omit'))
    throw new TypeError('credentials must be omit or same-origin');
  const fetcher = options.fetch ?? globalThis.fetch;
  return async (path, input = {}, responseType = 'json') => {
    const url = endpoint(baseUrl, path);
    const headers = new Headers(input.headers);
    for (const key of ['authorization', 'cookie', 'host', 'x-tenant', 'proxy-authorization'])
      if (headers.has(key)) throw new TypeError(`Configure the ${key} header through client options`);
    const method = (input.method ?? 'GET').toUpperCase();
    const token = typeof options.token === 'function' ? await options.token() : options.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.shop) headers.set('x-tenant', options.shop);
    if (buyerSession) buyerSessionHeaders(url, options.shop, options.credentials, headers);
    const pdf = responseType === 'pdf';
    const file = responseType === 'file';
    headers.set('Accept', file ? '*/*' : pdf ? 'application/pdf' : 'application/json');
    if (input.body !== undefined) headers.set('Content-Type', 'application/json');
    const timer = AbortSignal.timeout(timeoutMs);
    const signal = input.signal ? AbortSignal.any([timer, input.signal]) : timer;
    const mutating = !readOnly && !['GET', 'HEAD', 'OPTIONS'].includes(method);
    let dispatched = false;
    try {
      signal.throwIfAborted();
      const body = input.body === undefined ? undefined : JSON.stringify(input.body);
      dispatched = true;
      const response = await fetcher(url, { method, headers, body, signal,
        redirect: 'error', credentials: options.credentials ?? 'omit', cache: 'no-store' });
      if (!response.ok) {
        await response.body?.cancel();
        throw new VeyndoError(`Request failed with HTTP ${response.status}`, {
          kind: 'http', status: response.status, outcomeUnknown: mutating && response.status >= 500 });
      }
      const mime = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
      if (pdf && mime !== 'application/pdf') {
        await response.body?.cancel();
        throw new VeyndoError('Server did not return a PDF', { kind: 'protocol' });
      }
      if (file && (!mime || !/^attachment(?:;|$)/i.test(response.headers.get('content-disposition') ?? ''))) {
        await response.body?.cancel();
        throw new VeyndoError('Server did not return a file attachment', { kind: 'protocol' });
      }
      const data = await responseBytes(response, maxResponseBytes);
      if (file) return { bytes: data, mime };
      if (!pdf) return jsonBody(data);
      if (new TextDecoder().decode(data.subarray(0, 5)) !== '%PDF-') {
        throw new VeyndoError('Server returned an invalid PDF header', { kind: 'protocol' });
      }
      return data;
    } catch (cause) {
      const outcomeUnknown = dispatched && mutating;
      if (cause instanceof VeyndoError) {
        if (cause.kind === 'protocol') cause.outcomeUnknown = outcomeUnknown;
        throw cause;
      }
      const kind = input.signal?.aborted ? 'aborted' : timer.aborted ? 'timeout' : 'network';
      throw new VeyndoError({ aborted: 'Request cancelled', timeout: 'Request timed out',
        network: mutating ? 'Connection failed; inspect the original operation before repeating a write' :
          'Connection failed' }[kind],
        { kind, outcomeUnknown, cause });
    }
  };
}
