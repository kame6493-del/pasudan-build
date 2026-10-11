/**
 * 効果音と BGM。Web Audio で鳴らす(効果音は連打でも重ねて鳴る)。
 * 素材は効果音ラボ・魔王魂(出典は public/CREDITS.txt、加工は scripts/build_sfx.py / scripts/build_bgm.py)。
 * 効果音どうし・曲どうしの大きさの釣り合いはファイル側でそろえてある。ここは全体の音量だけ。
 *
 * 最初のタップまでは鳴らせない端末があるので、unlock() をタップで呼ぶ。BGM はそれまで鳴らさず、
 * 先に bgm() で頼まれた曲は unlock() のときに始める。アプリが裏に回ったら止め、戻ったら続きから鳴らす。
 * 効果音と BGM は別々にオン/オフ・音量を決められる(保存は呼ぶ側。setSound / setBgm / setSfxVolume / setBgmVolume)。
 */
import { App as CapApp } from '@capacitor/app';

export type Sfx = 'decide' | 'select' | 'tap' | 'slash' | 'hit' | 'crit' | 'damage' | 'wrong' | 'defeat' | 'levelup' | 'coin' | 'chest' | 'evolve' | 'combo' | 'pass' | 'fail';
/** 場面ごとの曲。victory だけはループせず 1 回鳴らして止まる */
export type Bgm = 'title' | 'dungeon' | 'battle' | 'boss' | 'victory';

const BASE_VOL = 0.8;
// 何度も鳴る tap と、斬る→当たる(140ms 差で重なる)の slash だけ下げる
const VOL: Partial<Record<Sfx, number>> = { slash: 0.75, tap: 0.55 };
/** BGM の音量の初期値(0〜1)。効果音より控えめ */
export const DEFAULT_BGM_VOLUME = 0.5;
/** 0〜1 の設定値を実際の音量に直す倍率(設定 0.5 で効果音より 10dB ほど小さい) */
const BGM_SCALE = 0.55;
/** ループの長さ(秒)。scripts/build_bgm.py の loop_sec。mp3 の頭の詰め物があっても継ぎ目がずれないように使う */
const BGM_LOOP: Partial<Record<Bgm, number>> = { title: 70.1233, dungeon: 73.8673, battle: 92.4263, boss: 98.9303 };
const FADE = 0.6;

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let bgmBus: GainNode | null = null;
const buffers = new Map<Sfx, AudioBuffer>();
let sfxOn = true;
let sfxVolume = 1;
let bgmOn = true;
let bgmVolume = DEFAULT_BGM_VOLUME;
let unlocked = false;
let hidden = false;

/** いま流すべき曲(オフ中・タップ前でも覚えておく) */
let wanted: Bgm | null = null;
/** いま鳴っている曲 */
let current: { name: Bgm; src: AudioBufferSourceNode; gain: GainNode } | null = null;
let switching = 0;
/** 曲の AudioBuffer は大きい(1 曲 30MB 前後)ので、直近 2 曲だけ持つ */
const bgmCache = new Map<Bgm, AudioBuffer>();

function ac(): AudioContext | null {
  if (ctx) return ctx;
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  ctx = new C();
  sfxBus = ctx.createGain();
  sfxBus.gain.value = sfxVolume;
  sfxBus.connect(ctx.destination);
  bgmBus = ctx.createGain();
  bgmBus.gain.value = bgmVolume * BGM_SCALE;
  bgmBus.connect(ctx.destination);
  return ctx;
}

// ---------------------------------------------------------------- 設定

/** 効果音のオン/オフ */
export function setSound(on: boolean) {
  sfxOn = on;
}

/** 効果音の音量(0〜1) */
export function setSfxVolume(v: number) {
  sfxVolume = clamp01(v);
  if (ctx && sfxBus) sfxBus.gain.setTargetAtTime(sfxVolume, ctx.currentTime, 0.02);
}

/** BGM のオン/オフ。オフにするとフェードして止め、オンに戻すといまの場面の曲を始める */
export function setBgm(on: boolean) {
  if (bgmOn === on) return;
  bgmOn = on;
  void sync();
}

/** BGM の音量(0〜1) */
export function setBgmVolume(v: number) {
  bgmVolume = clamp01(v);
  if (ctx && bgmBus) bgmBus.gain.setTargetAtTime(bgmVolume * BGM_SCALE, ctx.currentTime, 0.05);
}

export function soundSettings() {
  return { sfxOn, sfxVolume, bgmOn, bgmVolume };
}

function clamp01(v: number) {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

// ---------------------------------------------------------------- 効果音

async function load(name: Sfx): Promise<AudioBuffer | null> {
  const c = ac();
  if (!c) return null;
  const hit = buffers.get(name);
  if (hit) return hit;
  try {
    const res = await fetch(`./sfx/${name}.mp3`);
    const buf = await c.decodeAudioData(await res.arrayBuffer());
    buffers.set(name, buf);
    return buf;
  } catch {
    return null;
  }
}

/** タップで呼ぶ。止められていた音を出せるようにし、待たせていた BGM を始める */
export function unlock() {
  const c = ac();
  if (!c) return;
  unlocked = true;
  if (c.state === 'suspended' && !hidden) c.resume().catch(() => {});
  if (!current) void sync();
}

export function preload() {
  (['decide', 'select', 'tap', 'slash', 'hit', 'crit', 'damage', 'wrong', 'defeat', 'combo'] as Sfx[]).forEach((s) => void load(s));
}

export async function play(name: Sfx) {
  if (!sfxOn || hidden) return;
  const c = ac();
  if (!c || !sfxBus) return;
  const buf = await load(name);
  if (!buf) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = VOL[name] ?? BASE_VOL;
  src.connect(g).connect(sfxBus);
  src.start();
}

// ---------------------------------------------------------------- BGM

async function loadBgm(name: Bgm): Promise<AudioBuffer | null> {
  const c = ac();
  if (!c) return null;
  const hit = bgmCache.get(name);
  if (hit) {
    bgmCache.delete(name);
    bgmCache.set(name, hit); // 新しい順に並べ直す
    return hit;
  }
  try {
    const res = await fetch(`./bgm/${name}.mp3`);
    const buf = await c.decodeAudioData(await res.arrayBuffer());
    bgmCache.set(name, buf);
    while (bgmCache.size > 2) {
      const oldest = bgmCache.keys().next().value as Bgm;
      if (oldest === current?.name) break;
      bgmCache.delete(oldest);
    }
    return buf;
  } catch {
    return null;
  }
}

/** 頭の詰め物(デコーダが削らない端末で 20ms 前後の無音)を飛ばす位置 */
function headOffset(buf: AudioBuffer): number {
  const d = buf.getChannelData(0);
  const n = Math.min(d.length, Math.floor(buf.sampleRate * 0.1));
  for (let i = 0; i < n; i++) if (Math.abs(d[i]) > 1e-3) return i / buf.sampleRate;
  return 0;
}

/**
 * 場面の曲を決める。同じ曲なら何もしない(続きから流れる)。null で止める。
 * 'victory' は 1 回だけ鳴らす。終わった後は次に bgm() が呼ばれるまで静か。
 */
export function bgm(name: Bgm | null) {
  if (wanted === name && (name !== 'victory' || current?.name === 'victory')) return;
  wanted = name;
  void sync();
}

function fadeOut(cur: NonNullable<typeof current>) {
  if (!ctx) return;
  const t = ctx.currentTime;
  cur.gain.gain.cancelScheduledValues(t);
  cur.gain.gain.setValueAtTime(cur.gain.gain.value, t);
  cur.gain.gain.linearRampToValueAtTime(0, t + FADE);
  try {
    cur.src.stop(t + FADE + 0.05);
  } catch {
    /* もう止まっている */
  }
}

/** wanted・オン/オフ・タップ済みか から、鳴らすべき状態に合わせる */
async function sync() {
  const target = bgmOn && unlocked ? wanted : null;
  if (current && current.name === target) return;
  const my = ++switching;
  if (current) {
    fadeOut(current);
    current = null;
  }
  if (!target) return;
  const c = ac();
  if (!c || !bgmBus) return;
  const buf = await loadBgm(target);
  // 読み込み中に別の曲を頼まれた・オフにされた
  if (!buf || my !== switching) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  const loopLen = BGM_LOOP[target];
  const start = headOffset(buf);
  if (loopLen) {
    src.loop = true;
    src.loopStart = start;
    src.loopEnd = Math.min(buf.duration, start + loopLen);
  }
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(1, t + (target === 'victory' ? 0.02 : FADE));
  src.connect(g).connect(bgmBus);
  src.start(t, start);
  const me = { name: target, src, gain: g };
  current = me;
  src.onended = () => {
    if (current !== me) return;
    current = null;
    // 鳴り終わったジングルを、次のタップ(unlock → sync)で鳴らし直さない
    if (wanted === 'victory') wanted = null;
  };
}

// ---------------------------------------------------------------- 裏に回ったら止める

function setHidden(h: boolean) {
  if (hidden === h) return;
  hidden = h;
  if (!ctx) return;
  if (h) ctx.suspend().catch(() => {});
  else if (unlocked) ctx.resume().catch(() => {});
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => setHidden(document.visibilityState === 'hidden'));
}
try {
  void CapApp.addListener('appStateChange', ({ isActive }) => setHidden(!isActive));
} catch {
  /* ブラウザ(Capacitor の外)では visibilitychange だけで足りる */
}
