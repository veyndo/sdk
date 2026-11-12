/** Mount the same host controls using the official A2UI v1.0 message processor and Lit renderer. */
import { A2uiLitElement, A2uiSurface } from '@a2ui/lit';
import { Catalog, ColumnApi, MessageProcessor } from '@a2ui/web_core/v1_0';
import { html } from 'lit';
import { z } from 'zod/v3';
import { shopCatalog } from './layout.mjs';

class Shop extends A2uiLitElement {
  createRenderRoot() { return this; }
  render() {
    const children = this.controller.props?.children ?? [];
    return html`<div class="workspace">${children.map(child => this.renderNode(child))}</div>`;
  }
}

const slot = name => ({
  name,
  schema: z.object({}).strict(),
  tagName: 'veyndo-a2ui-' + name.toLowerCase(),
  element: class extends HTMLElement {
    connectedCallback() { this.dataset.panel = name; }
  },
});

const catalog = new Catalog(shopCatalog, '1.0', [
  { ...ColumnApi, name: 'Shop', tagName: 'veyndo-a2ui-shop', element: Shop },
  slot('Purchase'), slot('Guide'),
]);

export async function renderA2uiLayout(container, fallback, controls, { messages, generator }) {
  const processor = new MessageProcessor([catalog], undefined, { version: '1.0' });
  const surface = new A2uiSurface();
  try {
    processor.processMessages(messages);
    surface.surface = processor.getSurface('connected-shop');
    container.append(surface);
    await surface.updateComplete;
    const shop = surface.querySelector('veyndo-a2ui-shop');
    if (!shop) throw new Error('A2UI shop is missing');
    await shop.updateComplete;
    const slots = [...shop.querySelectorAll('[data-panel]')];
    const names = slots.map(panel => panel.dataset.panel);
    if (names.length !== 2 || !['Purchase', 'Guide'].every(name => names.includes(name)))
      throw new Error('A2UI layout needs one purchase and one guide panel');
    for (const panel of slots) panel.append(controls[panel.dataset.panel]);
    fallback.hidden = true;
    container.dataset.renderer = 'a2ui-v1';
    container.dataset.generator = generator === 'openai' ? 'openai' : 'local';
  } catch (error) {
    surface.remove();
    processor.model.dispose();
    throw error;
  }
}
