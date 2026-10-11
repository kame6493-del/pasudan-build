import { useState } from 'react';
import { CONFIG } from '../config';
import { addDays, emptyData, QUESTIONS, TERMS, todayKey } from '../domain/data';
import { resetMock } from '../platform/billing';
import { play, setBgm, setBgmVolume, setSfxVolume, setSound } from '../platform/sound';
import { clearData } from '../platform/storage';
import { Calendar } from './Onboarding';
import { useStore } from './store';

export function Settings({ onClose }: { onClose: () => void }) {
  const { data, update, go, restorePurchases, confirm } = useStore();
  const [page, setPage] = useState<'main' | 'date' | 'credits'>('main');
  const [date, setDate] = useState(data.examDate ?? addDays(todayKey(), 90));
  const years = [...new Set(QUESTIONS.map((q) => q.year))].join('・');

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {page === 'main' && (
          <>
            <h2>設定</h2>
            <button
              className="list-btn"
              onClick={() => {
                const on = !data.bgm;
                setBgm(on);
                update((d) => ({ ...d, bgm: on }));
              }}
            >
              BGM
              <span className={`toggle ${data.bgm ? 'on' : ''}`} />
            </button>
            {data.bgm && (
              <VolumeRow
                label="BGM の音量"
                value={data.bgmVol}
                onChange={(v) => {
                  setBgmVolume(v);
                  update((d) => ({ ...d, bgmVol: v }));
                }}
              />
            )}
            <button
              className="list-btn"
              onClick={() => {
                const on = !data.sound;
                setSound(on);
                update((d) => ({ ...d, sound: on }));
              }}
            >
              効果音
              <span className={`toggle ${data.sound ? 'on' : ''}`} />
            </button>
            {data.sound && (
              <VolumeRow
                label="効果音の音量"
                value={data.sfxVol}
                onChange={(v) => {
                  setSfxVolume(v);
                  update((d) => ({ ...d, sfxVol: v }));
                }}
                onCommit={() => void play('coin')}
              />
            )}
            <button className="list-btn" onClick={() => setPage('date')}>
              試験日
              <span className="muted">{data.examDate ?? '未設定'} ›</span>
            </button>
            <button
              className="list-btn"
              onClick={() => {
                onClose();
                go({ name: 'tab', tab: 'shop' });
              }}
            >
              主人公・相棒の見た目 <span className="muted">›</span>
            </button>
            <button className="list-btn" onClick={() => void restorePurchases()}>
              購入を復元する <span className="muted">›</span>
            </button>
            <button className="list-btn" onClick={() => setPage('credits')}>
              問題の出典・素材について <span className="muted">›</span>
            </button>
            <a className="list-btn" href={CONFIG.privacyUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              プライバシーポリシー <span className="muted">›</span>
            </a>
            <button
              className="list-btn"
              style={{ color: 'var(--red)' }}
              onClick={async () => {
                if (!(await confirm({ title: '記録をすべて消しますか？', body: '学習の記録・コイン・カードがすべて消えます。元に戻せません（購入は消えません）。', ok: '消す', cancel: 'やめる', danger: true }))) return;
                await clearData();
                resetMock();
                const owned = data.owned;
                update(() => ({ ...emptyData(), owned }));
                onClose();
                go({ name: 'title' });
              }}
            >
              記録をすべて消す <span />
            </button>
            <p className="muted small">
              {CONFIG.appName}({CONFIG.fullName}) v{CONFIG.version}
              <br />
              記録はこの端末の中だけに保存されます。アカウントやサーバーは使いません。
            </p>
            <button className="btn paper sm" onClick={onClose}>
              とじる
            </button>
          </>
        )}
        {page === 'date' && (
          <>
            <h2>試験日</h2>
            <Calendar value={date} onChange={setDate} />
            <div className="btns">
              <button
                className="btn paper sm"
                onClick={() => {
                  update((d) => ({ ...d, examDate: null }));
                  setPage('main');
                }}
              >
                未設定にする
              </button>
              <button
                className="btn sm"
                onClick={() => {
                  update((d) => ({ ...d, examDate: date }));
                  setPage('main');
                }}
              >
                決定
              </button>
            </div>
          </>
        )}
        {page === 'credits' && (
          <>
            <h2>問題の出典・素材について</h2>
            <p style={{ lineHeight: 1.7, fontSize: 14 }}>
              問題文・選択肢・正解は、独立行政法人情報処理推進機構（IPA）が公開している ITパスポート試験の公開問題（{years}）から引用しています。各問題に「出典: 独立行政法人情報処理推進機構 ITパスポート試験 ○年度 問○」を表示しています。図が必要な問題は収録していません。
            </p>
            <p style={{ lineHeight: 1.7, fontSize: 14 }}>
              収録 {QUESTIONS.length}問・用語カード {TERMS.length}枚。解説と用語の説明はこのアプリで書いたもので、IPA の公式解説ではありません。
            </p>
            <p style={{ lineHeight: 1.7, fontSize: 14 }}>
              予想点は解いた問題の正誤から出した目安です。本番は IRT（項目応答理論）で採点されるため、点数は一致しません。
            </p>
            <p style={{ lineHeight: 1.7, fontSize: 14 }}>
              音楽：魔王魂(maou.audio)。効果音：魔王魂、効果音ラボ(soundeffect-lab.info)。書体: M PLUS Rounded 1c(SIL Open Font License 1.1)。
            </p>
            <p className="muted small">ITパスポート試験は、独立行政法人情報処理推進機構の国家試験です。このアプリは IPA とは関係のない個人が作ったものです。</p>
            <button className="btn paper sm" onClick={() => setPage('main')}>
              もどる
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** 音量のつまみ(0〜100%)。動かしている間も音量が変わる。指を離したら onCommit(効果音の試し鳴らし) */
function VolumeRow({ label, value, onChange, onCommit }: { label: string; value: number; onChange: (v: number) => void; onCommit?: () => void }) {
  return (
    <label className="list-btn" style={{ gap: 12 }}>
      <span style={{ whiteSpace: 'nowrap', fontSize: 14 }}>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(value * 100)}
        aria-label={label}
        style={{ flex: 1, minWidth: 0, accentColor: 'var(--green)' }}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
      <span className="muted" style={{ width: 40, textAlign: 'right', fontSize: 13 }}>
        {Math.round(value * 100)}%
      </span>
    </label>
  );
}
