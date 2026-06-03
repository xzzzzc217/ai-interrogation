import Phaser from 'phaser';

/** The overlay layer that floats above the Phaser <canvas>. */
export function uiRoot(): HTMLElement {
  return document.getElementById('ui-root')!;
}

type Attrs = Record<string, unknown>;

/** Minimal hyperscript so scenes can build DOM without a framework. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v as object);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v as object);
    else if (k.startsWith('on') && typeof v === 'function')
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) el.append(c);
  return el;
}

/** Mount a panel for the lifetime of a scene; removed on shutdown/destroy. */
export function mountPanel(scene: Phaser.Scene, node: HTMLElement): HTMLElement {
  uiRoot().appendChild(node);
  const cleanup = () => node.remove();
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  return node;
}

/** A centered modal over a dimming scrim. Returns a close() function. */
export function openModal(content: HTMLElement): () => void {
  const close = () => scrim.remove();
  const scrim = h('div', { class: 'modal-scrim' }, [content]);
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) close();
  });
  uiRoot().appendChild(scrim);
  return close;
}

/** Transient bottom toast. */
export function toast(msg: string, ms = 2200): void {
  const t = h('div', { class: 'toast' }, [msg]);
  uiRoot().appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s ease';
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, ms);
}
