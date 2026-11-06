/**
 * 遊び方の案内(4画面)。最初の起動のあとと、設定の「遊び方をもう一度見る」から出す。飛ばせる。
 * 中身は今の仕組みどおり(正解=攻撃、まちがい=反撃と解説、階は敵5体と中ボス、苦手は2回続けて正解で消える)。
 */
import { useState } from 'react';
import { art } from '../domain/world';
import { play } from '../platform/sound';
import { Check } from './icons';

const SLIDES = [
  {
    t: '問題に答えると攻撃',
    imgs: [art('hero_back'), art('mon_slime')],
    d: ['4つの答えから1つを選びます', '正解すると攻撃が当たって敵の HP が減ります', '早く正解するとクリティカル、続けて正解するとコンボ'],
  },
  {
    t: 'まちがえると反撃',
    imgs: [art('mon_bat'), art('ui_heart')],
    d: ['まちがえると敵の反撃で HP が減ります', 'すぐに解説が出るので、読んでから次へ', 'HP が 0 になると、その階はやり直し'],
  },
  {
    t: '階を進んで、模擬試験へ',
    imgs: [art('book_strategy'), art('book_management'), art('book_technology'), art('boss_celes')],
    d: ['1つの階は敵5体と中ボス', '3つのダンジョンが試験の3分野', '最後は本番と同じ100問・120分の模擬試験ボス'],
  },
  {
    t: '苦手は記録されて、消していける',
    imgs: [art('ui_devil'), art('card_books')],
    d: ['まちがえた問題は「苦手」に入ります', '2回続けて正解すると苦手から消えます', '出てきた用語は「学ぶ」の覚えるカードにたまります'],
  },
];

export function Tutorial({ onDone, last = 'はじめる' }: { onDone: () => void; last?: string }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const end = i === SLIDES.length - 1;
  return (
    <div className="tutorial">
      <div className="steps">
        {SLIDES.map((_, n) => (
          <i key={n} className={n === i ? 'on' : ''}>
            {n + 1}
          </i>
        ))}
      </div>
      <h2 style={{ justifyContent: 'center' }}>{s.t}</h2>
      <div className="tut-art">
        {s.imgs.map((x, k) => (
          <img key={k} src={x} alt="" />
        ))}
      </div>
      <ul className="tut-list">
        {s.d.map((x) => (
          <li key={x}>
            <Check size={18} color="var(--hi-green)" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
      <div className="btns">
        <button className="btn paper" style={{ flex: '0 0 34%' }} onClick={onDone}>
          飛ばす
        </button>
        <button
          className={`btn ${end ? 'gold' : ''}`}
          onClick={() => {
            void play('decide');
            if (end) onDone();
            else setI(i + 1);
          }}
        >
          {end ? last : 'つぎへ ›'}
        </button>
      </div>
    </div>
  );
}
