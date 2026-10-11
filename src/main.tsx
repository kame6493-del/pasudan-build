import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './ui/App';

/** 書体(M PLUS Rounded 1c の 500 / 700 / 800)を読み込んでから描く。端末の書体で一瞬出て入れ替わるのを防ぐ。
 *  読み込めない時も 2.5 秒で先へ進む(その時は端末の丸ゴシック・ゴシックで出る) */
async function fontsReady() {
  if (!('fonts' in document)) return;
  const load = Promise.all(['500 16px PD', '700 16px PD', '800 16px PD'].map((f) => document.fonts.load(f, 'あ亜A1')));
  await Promise.race([load, new Promise((r) => setTimeout(r, 2500))]);
}

fontsReady().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
