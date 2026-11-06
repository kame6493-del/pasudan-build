import { useCallback, useRef } from 'react';

/** 幅に収まらない1行の文字(タブの名前など)を、横に縮めて枠の中に収める。
 *  端末の文字サイズを最大にした時や、表示サイズを大きくして画面が狭い時に、隣とぶつからないようにする(2026-10-24)。 */
export function fitLabels(root: HTMLElement, selector: string) {
  root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    el.style.transform = '';
    const box = el.parentElement;
    if (!box) return;
    const room = box.clientWidth - 4;
    const need = el.scrollWidth;
    if (room > 0 && need > room) el.style.transform = `scale(${Math.max(0.5, room / need)})`;
  });
}

/** callback ref。付いた要素の大きさが変わるたびに selector の文字を収め直す */
export function useFitLabels<T extends HTMLElement>(selector: string) {
  const obs = useRef<ResizeObserver | null>(null);
  return useCallback(
    (node: T | null) => {
      obs.current?.disconnect();
      obs.current = null;
      if (!node) return;
      const run = () => fitLabels(node, selector);
      run();
      if (typeof ResizeObserver !== 'undefined') {
        obs.current = new ResizeObserver(run);
        obs.current.observe(node);
        node.querySelectorAll(selector).forEach((el) => obs.current?.observe(el));
      }
      void document.fonts?.ready.then(run);
    },
    [selector],
  );
}
