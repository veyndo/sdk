/** Attach the proof for an existing host-only buyer session on the current shop origin. */
export function isBuyerBrowserOrigin(url, shop, credentials) {
  return credentials === 'same-origin' && typeof globalThis.document !== 'undefined' &&
    url.origin === globalThis.location?.origin && /^[a-z0-9-]{2,48}$/.test(shop ?? '');
}

export function buyerSessionHeaders(url, shop, credentials, headers) {
  if (!isBuyerBrowserOrigin(url, shop, credentials) || !url.pathname.startsWith('/store-api/')) {
    return;
  }
  const token = headers.get('x-customer-token');
  if (token && token !== 'browser-customer-session') return;

  const prefix = url.protocol === 'https:' ? '__Host-' : '';
  const name = `${prefix}veyndo-customer-csrf-${shop}=`;
  const proofs = (globalThis.document?.cookie ?? '').split(';')
    .map(entry => entry.trim())
    .filter(entry => entry.startsWith(name));
  const proof = proofs[0]?.slice(name.length);
  if (proofs.length !== 1 || !/^[a-f0-9]{64}$/i.test(proof)) return;

  headers.delete('x-customer-token');
  headers.set('x-veyndo-customer-session', '1');
  headers.set('x-veyndo-customer-csrf', proof);
}
