// dist/phone.html: パソコンのブラウザで 390x844 のスマホ枠に入れて見るためのページ
import { writeFileSync } from 'node:fs';
writeFileSync(
  'dist/phone.html',
  `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>パスダン(スマホ表示)</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#2a3350;font-family:sans-serif}
.f{width:390px;height:844px;border-radius:44px;border:12px solid #0d0f17;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);background:#000}
iframe{width:390px;height:844px;border:0;display:block}</style></head>
<body><div class="f"><iframe src="/" title="パスダン"></iframe></div></body></html>`,
);
console.log('phone.html written');
