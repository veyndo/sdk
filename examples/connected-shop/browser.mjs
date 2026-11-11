/** Connect a read-only MCP App to its conversation and keep checkout approval in the host. */
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import { renderLayout } from './openui.mjs';
import { layoutSource } from './layout.mjs';

const element = id => document.getElementById(id);
const review = element('review');
const confirm = element('confirm');
const recover = element('recover');
const ask = element('ask');
const checkoutState = element('checkout-state');
const answer = element('answer');
const item = element('item');
let state = { kind: 'empty' };
let busy = false;

async function api(path, data) {
  const response = await fetch(path, data === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error);
  return payload;
}

function show(next) {
  state = next;
  const finished = state.kind === 'receipt' || state.kind === 'pending';
  if (state.item) item.value = state.item.id;
  item.disabled = busy || finished;
  review.hidden = finished || state.kind === 'quote';
  review.disabled = busy || !item.value;
  confirm.hidden = state.kind !== 'quote';
  confirm.disabled = busy;
  recover.hidden = state.kind !== 'pending';
  recover.disabled = busy;
  const money = value => new Intl.NumberFormat('en', { style: 'currency', currency: state.currency }).format(value);
  const total = state.totalMinor ? money(Number(state.totalMinor) / 100) : '';
  const delivery = state.delivery
    ? ' · Delivery ' + state.delivery.earliest + (state.delivery.latest === state.delivery.earliest
      ? '' : ' to ' + state.delivery.latest) + ' (' + state.country + ')'
    : '';
  checkoutState.textContent = ({
    empty: 'Your cart is empty.',
    quote: state.kind === 'quote' ? 'Review ' + state.item.label + ' · ' + total + ' total · '
      + money(state.shipping) + ' shipping' + delivery : '',
    receipt: 'Order ' + state.orderNumber + ' · ' + state.item?.label + ' · ' + total + ' · Your cart is empty.',
    pending: 'Waiting for the original order receipt.',
    unavailable: 'This option is no longer available. Choose another variant or reload for current stock.',
    'review-again': 'The quote changed. Review a fresh total before confirming.',
  })[state.kind];
}

item.addEventListener('change', () => show({ kind: 'empty' }));

for (const [button, path] of [[review, '/review'], [confirm, '/confirm'], [recover, '/status']]) {
  button.addEventListener('click', async () => {
    const data = button === review ? { itemId: item.value }
      : button === confirm ? { reviewKey: state.reviewKey } : {};
    busy = true;
    show(state);
    try {
      state = await api(path, data);
      busy = false;
      show(state);
    } catch (error) {
      busy = false;
      show(button === confirm ? { kind: 'pending', item: state.item } : state);
      checkoutState.textContent = error.message;
    }
  });
}

async function showGuide(turn) {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.title = 'Product Guide';
  element('guide').replaceChildren(frame);
  const source = frame.contentWindow;
  const bridge = new AppBridge(null, { name: 'Veyndo SDK example', version: '1.0.0' },
    { serverTools: {} }, {
      hostContext: { locale: 'en', 'ai.veyndo/definition': turn.definition },
    });
  bridge.oninitialized = async () => {
    await bridge.sendToolInput({ arguments: turn.arguments });
    await bridge.sendToolResult(turn.result);
    answer.textContent = turn.answer;
  };
  bridge.oncalltool = async ({ name, arguments: args }) => {
    if (name !== turn.definition.toolName ||
        args?.filter?.product_id !== turn.arguments.filter.product_id ||
        Object.keys(args.filter).some(key => key !== 'product_id' && key !== 'segment'))
      throw new Error('Only this guide can read this product');
    return api('/filter', { segment: args.filter.segment, after: args.after });
  };
  bridge.onerror = () => { answer.textContent = 'The product guide could not be opened.'; };
  await bridge.connect(new PostMessageTransport(source, source));
  frame.src = '/guide-frame';
}

ask.addEventListener('click', async () => {
  ask.disabled = true;
  element('turn').hidden = false;
  answer.textContent = 'Opening the product guide…';
  try {
    await showGuide(await api('/ask', {}));
    ask.hidden = true;
  } catch (error) {
    answer.textContent = error.message;
    ask.disabled = false;
  }
});

try {
  const focus = location.hash === '#guide' ? 'guide' : 'checkout';
  const [product, layout] = await Promise.all([
    api('/product'),
    api('/layout', { focus }).catch(() => ({ source: layoutSource(focus), generator: 'local' })),
  ]);
  renderLayout(element('generated-workspace'), element('base-workspace'), {
    Purchase: element('purchase-panel'), Guide: element('guide-panel'),
  }, layout);
  element('product').textContent = product.name;
  for (const choice of product.choices) {
    const option = new Option(choice.stock > 0 ? choice.label : choice.label + ' (out of stock)', choice.id);
    option.disabled = choice.stock <= 0;
    item.add(option);
  }
  item.value = product.choices.find(choice => choice.stock > 0)?.id ?? '';
  element('choice-field').hidden = product.choices.length === 1;
  element('availability').textContent = item.value ? 'Available in this shop' : 'Out of stock';
  ask.disabled = false;
  show(await api('/status', {}));
} catch (error) {
  element('availability').textContent = error.message;
}
