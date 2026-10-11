import { useEffect, useRef } from 'react';

/**
 * Android の戻るボタン。上に重なっている画面(確認・案内・バトルなど)から順に受ける。
 * 受けた画面が true を返したらそこで止める。どれも受けなければ App が画面の移動で戻す。
 */
type Handler = () => boolean | void;
const stack: { current: Handler }[] = [];

export function useBack(fn: Handler, active = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const h = { current: () => ref.current() };
    stack.push(h);
    return () => {
      const k = stack.indexOf(h);
      if (k >= 0) stack.splice(k, 1);
    };
  }, [active]);
}

/** いちばん上の画面に戻るを渡す。受けた画面があれば true */
export function backToTop(): boolean {
  for (let k = stack.length - 1; k >= 0; k--) {
    if (stack[k].current() !== false) return true;
  }
  return false;
}
