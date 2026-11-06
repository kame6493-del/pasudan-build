import { QUESTIONS } from '../domain/data';
import { canTakeExam, examLimitMin, FREE_EXAMS, freeExamsLeft, YEARS } from '../domain/game';
import { art } from '../domain/world';
import { LockIcon } from './icons';
import { useBack } from './back';
import { useStore } from './store';

/** 模擬試験の選び方。ランダム（本番の配分）と、年度別の過去問（本番と同じ並び） */
export function ExamPicker({ onClose }: { onClose: () => void }) {
  const { data, startBattle, askFull, confirm, update } = useStore();
  const ok = canTakeExam(data);
  const draft = data.examDraft;
  useBack(onClose);
  const best = (year?: string) => {
    const xs = data.exams.filter((e) => (e.year ?? '') === (year ?? ''));
    return xs.length ? Math.max(...xs.map((e) => e.total)) : null;
  };
  const start = async (year?: string) => {
    if (!ok) return askFull(`無料の模擬試験（${FREE_EXAMS}回）は使い終わりました。完全版なら本番と同じ100問・120分の模擬試験に何回でも挑戦できます。弱い分野を見つけて、合格ラインまで何点足りないかを何度でも確かめられます。`, 'exam-limit');
    if (draft && !(await confirm({ body: '途中の模擬試験があります。新しく始めると、途中の解答は消えます。', ok: '新しく始める', cancel: 'やめる', danger: true }))) return;
    if (draft) update((d) => ({ ...d, examDraft: null }));
    onClose();
    startBattle({ kind: 'exam', year });
  };
  const resume = () => {
    onClose();
    startBattle({ kind: 'exam', resume: true });
  };
  const discard = async () => {
    if (await confirm({ body: '途中の模擬試験を捨てますか？ 答えた解答は採点されずに消えます。', ok: '捨てる', cancel: 'やめる', danger: true })) update((d) => ({ ...d, examDraft: null }));
  };
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <img src={art('boss_celes')} alt="" style={{ height: 64 }} />
          <div className="grow">
            <h2 style={{ margin: 0 }}>模擬試験ボス</h2>
            <div className="muted small">合格ライン: 総合600点・各分野300点（1000点満点）</div>
          </div>
        </div>
        {draft && (
          <div className="panel" style={{ marginTop: 10, background: 'var(--inset)' }}>
            <b>途中の模擬試験があります</b>
            <div className="muted small">
              {draft.year ?? 'ランダム模試'} ・ {draft.ans.filter((a) => a !== null).length} / {draft.ids.length}問 答えた ・ 残り {Math.max(0, Math.ceil(examLimitMin(draft.ids.length) - draft.elapsed / 60000))}分
            </div>
            <div className="btns" style={{ marginTop: 8 }}>
              <button className="btn paper sm" style={{ flex: '0 0 38%' }} onClick={() => void discard()}>
                捨てる
              </button>
              <button className="btn gold sm" onClick={resume}>
                続きから ›
              </button>
            </div>
          </div>
        )}
        {!data.owned.full && (
          <div className="pw-score" style={{ marginTop: 10 }}>
            {ok ? (
              <>
                無料で<b> あと {freeExamsLeft(data)} 回 </b>挑戦できます（全部で {FREE_EXAMS} 回）。1問答えた時に1回と数えます。
                <br />
                <span className="small">答えた所までは保存され、続きから再開できます。時間を気にせず解くなら「過去問道場」（無料・何回でも）へ。</span>
              </>
            ) : (
              <>
                無料の {FREE_EXAMS} 回は使いました。
              </>
            )}
          </div>
        )}
        <button className="exam-row main" onClick={() => void start()}>
          <span className="grow">
            <b>ランダム模試 100問・120分</b>
            <span className="muted small">全年度から本番と同じ配分（ストラテジ35・マネジメント20・テクノロジ45）</span>
          </span>
          {best() !== null && <span className="best">ベスト {best()}</span>}
          {!ok && <LockIcon color="#6b5a48" />}
        </button>
        <h3 style={{ margin: '14px 0 4px' }}>年度別の過去問（本番と同じ並び）</h3>
        {YEARS.map((y) => {
          const n = QUESTIONS.filter((q) => q.year === y).length;
          return (
            <button key={y} className="exam-row" onClick={() => void start(y)}>
              <span className="grow">
                <b>{y}</b>
                <span className="muted small">
                  {n}問・{examLimitMin(n)}分{n < 100 ? '（図が必要な問題などを除く）' : ''}
                </span>
              </span>
              {best(y) !== null && <span className="best">ベスト {best(y)}</span>}
              {!ok && <LockIcon color="#6b5a48" />}
            </button>
          );
        })}
        <button className="btn paper sm" style={{ marginTop: 12 }} onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}
