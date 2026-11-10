/** Connect a read-only MCP App to its conversation and keep checkout approval in the host. */
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';

const element = id => document.getElementById(id);
const review = element('review');
const confirm = element('confirm');
const recover = element('recover');
const ask = element('ask');
const checkoutState = element('checkout-state');
const answer = element('answer');
let stocked = false;

async function api(path, data) {
  const response = await fetch(path, data === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error);
  return payload;
}

function show(state) {
  review.hidden = state.kind !== 'empty' && state.kind !== 'review-again';
  review.disabled = !stocked;
  confirm.hidden = state.kind !== 'quote';
  recover.hidden = state.kind !== 'pending';
  const total = typeof state.totalMinor === 'string'
    ? new Intl.NumberFormat('en', { style: 'currency', currency: state.currency }).format(Number(state.totalMinor) / 100)
    : '';
  checkoutState.textContent = ({
    empty: 'Your cart is empty.',
    quote: 'Review total: ' + total,
    receipt: 'Order ' + state.orderNumber + ' · ' + total + ' · Your cart is empty.',
    pending: 'Waiting for the original order receipt.',
    'review-again': 'The quote changed. Review a fresh total before confirming.',
  })[state.kind];
}

for (const [button, path] of [[review, '/review'], [confirm, '/confirm'], [recover, '/status']]) {
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      show(await api(path, {}));
    } catch (error) {
      checkoutState.textContent = error.message;
      if (button === confirm) {
        confirm.hidden = true;
        recover.hidden = false;
      }
    } finally {
      button.disabled = button === review && !stocked;
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
  const product = await api('/product');
  element('product').textContent = product.name;
  stocked = product.stock > 0;
  element('availability').textContent = stocked ? 'Available in this shop' : 'Out of stock';
  ask.disabled = false;
  show(await api('/status', {}));
} catch (error) {
  element('availability').textContent = error.message;
}
