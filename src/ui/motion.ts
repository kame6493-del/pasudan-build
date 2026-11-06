import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** 端末で「動きを減らす」が選ばれているか(変わったら追いかける) */
export function useOsReduceMotion(): boolean {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const f = () => setOn(mq.matches);
    mq.addEventListener?.('change', f);
    return () => mq.removeEventListener?.('change', f);
  }, []);
  return on;
}

/** 「動きを少なく」を画面全体に効かせる(html に calm を付ける。止め方は index.css の「動きを少なく」) */
export function applyCalm(on: boolean): void {
  document.documentElement.classList.toggle('calm', on);
}
