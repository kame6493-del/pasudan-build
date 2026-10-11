import { art } from '../domain/world';
import { play, unlock } from '../platform/sound';
import { useStore } from './store';

export function Title() {
  const { data, go, openSettings } = useStore();
  const start = () => {
    unlock();
    void play('decide');
    go(data.onboarded ? { name: 'tab', tab: 'dungeon' } : { name: 'onboard' }, true);
  };
  return (
    <div className="title-screen" style={{ backgroundImage: `url(${art('bg_title')})` }}>
      <div className="menu">
        <button className="btn gold" onClick={start}>
          <img src={art('hero_back')} alt="" style={{ height: 30 }} />
          {data.onboarded ? 'つづきから' : 'はじめる'}
        </button>
        <button className="btn paper sm" onClick={openSettings}>
          データについて
        </button>
        <p className="title-note">
          <span>問題は IPA が公開している</span>
          <span>ITパスポート試験の過去問題です。</span>
          <br />
          <span>このアプリは IPA とは関係のない</span>
          <span>個人の制作です。</span>
        </p>
      </div>
    </div>
  );
}
