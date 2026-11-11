/** Render the admitted OpenUI layout around the host's existing interactive controls. */
import { createElement, createContext, useContext, useLayoutEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { createLibrary, defineComponent, Renderer } from '@openuidev/react-lang';
import { z } from 'zod';
import { isLayoutSource } from './layout.mjs';

const bindings = createContext(null);
const slot = name => defineComponent({
  name,
  description: 'A host-owned storefront panel.',
  props: z.object({}),
  component: () => {
    const controls = useContext(bindings)[name];
    const target = useRef(null);
    useLayoutEffect(() => { target.current.append(controls); }, [controls]);
    return createElement('div', { ref: target, 'data-panel': name });
  },
});

const library = createLibrary({
  root: 'Shop',
  components: [
    defineComponent({
      name: 'Shop',
      description: 'Arrange the two storefront panels.',
      props: z.object({ panels: z.array(z.unknown()).length(2) }),
      component: ({ props, renderNode }) => createElement('div', { className: 'workspace' },
        props.panels.map((panel, index) => createElement('div', { key: index }, renderNode(panel)))),
    }),
    slot('Purchase'),
    slot('Guide'),
  ],
});

export function renderLayout(container, fallback, controls, { source, generator }) {
  if (!isLayoutSource(source)) return;
  const root = createRoot(container);
  flushSync(() => root.render(createElement(bindings.Provider, { value: controls },
    createElement(Renderer, { response: source, library, isStreaming: false }))));
  if (Object.values(controls).every(control => container.contains(control))) {
    fallback.hidden = true;
    container.dataset.generator = generator === 'openai' ? 'openai' : 'local';
  } else {
    fallback.append(...Object.values(controls));
    root.unmount();
  }
}
