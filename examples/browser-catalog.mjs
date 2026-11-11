const form = document.querySelector('form');
const status = document.querySelector('#status');
const products = document.querySelector('#products');
const more = document.querySelector('#more');
const detail = document.querySelector('#detail');
const title = document.querySelector('#detail-title');
const detailStatus = document.querySelector('#detail-status');
const price = document.querySelector('#price');
const stock = document.querySelector('#stock');
let search = '';
let cursor = null;
let listRequest;
let detailRequest;
let selected;

async function read(path, params, signal) {
  const response = await fetch(`${path}?${new URLSearchParams(params)}`, { signal });
  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error);
  }
  return response.json();
}

function resetDetail() {
  detailRequest?.abort();
  selected?.removeAttribute('aria-current');
  selected = undefined;
  detail.setAttribute('aria-busy', 'false');
  title.textContent = 'Product details';
  detailStatus.textContent = 'Choose a product to view its details.';
  price.hidden = stock.hidden = true;
}

async function openProduct(item, button) {
  resetDetail();
  detailRequest = new AbortController();
  const { signal } = detailRequest;
  selected = button;
  button.setAttribute('aria-current', 'true');
  title.textContent = item.name;
  detailStatus.textContent = 'Loading product…';
  detail.setAttribute('aria-busy', 'true');
  title.focus();
  try {
    const { product } = await read('/catalog/product', { id: item.id }, signal);
    if (signal.aborted) return;
    title.textContent = product.name;
    price.textContent = new Intl.NumberFormat(document.documentElement.lang, {
      style: 'currency', currency: product.currency,
    }).format(product.price);
    stock.textContent = product.stock > 0 ? `${product.stock} in stock` : 'Out of stock';
    price.hidden = stock.hidden = false;
    detailStatus.textContent = '';
  } catch (error) {
    if (!signal.aborted) detailStatus.textContent = error.message;
  } finally {
    if (!signal.aborted) detail.setAttribute('aria-busy', 'false');
  }
}

async function loadPage(after = null) {
  listRequest?.abort();
  listRequest = new AbortController();
  const { signal } = listRequest;
  more.disabled = true;
  if (!after) {
    products.replaceChildren();
    cursor = null;
    more.hidden = true;
    resetDetail();
  }
  status.textContent = 'Loading products…';
  try {
    const params = search ? { search } : {};
    if (after) params.after = after;
    const page = await read('/catalog', params, signal);
    if (signal.aborted) return;
    for (const item of page.elements) {
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.name;
      button.addEventListener('click', () => openProduct(item, button));
      row.append(button);
      products.append(row);
    }
    cursor = page.nextCursor;
    const count = products.children.length;
    status.textContent = count
      ? `${count} ${count === 1 ? 'product' : 'products'} shown.`
      : 'No products match. Try a different search or clear the field.';
  } catch (error) {
    if (!signal.aborted) status.textContent = error.message;
  } finally {
    if (!signal.aborted) {
      more.hidden = !cursor;
      more.disabled = false;
    }
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  search = new FormData(form).get('query').trim();
  void loadPage();
});
more.addEventListener('click', () => void loadPage(cursor));
void loadPage();
