import { useLayoutEffect, type RefObject } from 'react';

/** 詰め方の段の数(0=ふつう … FIT_MAX=いちばん詰める)。中身は index.css の「スクロールせずに答える」 */
export const FIT_MAX = 5;

/** 問題文・選択肢・ボタンが1画面に入っているか(はみ出していたら true) */
function overflows(root: HTMLElement): boolean {
  const panel = root.querySelector<HTMLElement>('.qpanel');
  const box = root.querySelector<HTMLElement>('.qscroll');
  if (!panel) return false;
  if (panel.scrollHeight > panel.clientHeight + 1) return true;
  return !!box && box.scrollHeight > box.clientHeight + 1;
}

/** 段を0から上げていき、はみ出さない最初の段を root の data-fit に置く */
export function fitQuestion(root: HTMLElement): number {
  for (let lv = 0; lv <= FIT_MAX; lv++) {
    root.dataset.fit = String(lv);
    if (!overflows(root)) return lv;
  }
  return FIT_MAX;
}

/**
 * 問題を解く画面で、スクロールせずに答えられるよう文字・余白・舞台の高さを段階的に詰める(2026-10-24 持ち主の指示)。
 * それでも入らない時だけ、問題文の部分(.qscroll)が中でスクロールする(選択肢は常に見える)。
 * active=false(見返し・分かれ道など)の間は外す。answered の間は段を変えない(答えた直後に舞台の高さが跳ねないように)。
 */
export function useQuestionFit(root: RefObject<HTMLElement | null>, active: boolean, answered: boolean, key: unknown) {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (!active) {
      delete el.dataset.fit;
      return;
    }
    if (answered) return;
    let off = false;
    const run = () => {
      if (!off) fitQuestion(el);
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(el);
    void document.fonts?.ready.then(run);
    return () => {
      off = true;
      ro.disconnect();
    };
  }, [root, active, answered, key]);
}
