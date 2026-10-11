import { Preferences } from '@capacitor/preferences';
import { emptyData, normalize } from '../domain/data';
import type { AppData } from '../domain/types';

/**
 * 記録は端末の中だけ。アカウントもサーバーも使わない。
 * Preferences はネイティブでは UserDefaults / SharedPreferences、ブラウザでは localStorage に書く。
 * 書く前に前回の分を .prev に残す。読めなければ .prev から戻す。
 */
const KEY = 'pasudan.data.v1';
const BACKUP = `${KEY}.prev`;

export async function loadData(): Promise<AppData> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (value) return normalize(JSON.parse(value));
  } catch (e) {
    console.error('[pasudan] load', e);
  }
  try {
    const prev = await Preferences.get({ key: BACKUP });
    if (prev.value) return normalize(JSON.parse(prev.value));
  } catch {
    /* 控えも読めなければ空から */
  }
  return emptyData();
}

let chain: Promise<void> = Promise.resolve();

/** 書き込みは1本ずつ順番に */
export function saveData(data: AppData): Promise<void> {
  const json = JSON.stringify(data);
  chain = chain
    .then(async () => {
      const cur = await Preferences.get({ key: KEY });
      if (cur.value && cur.value !== json) await Preferences.set({ key: BACKUP, value: cur.value });
      await Preferences.set({ key: KEY, value: json });
    })
    .catch((e) => console.error('[pasudan] save', e));
  return chain;
}

export async function clearData(): Promise<void> {
  await Preferences.remove({ key: KEY });
  await Preferences.remove({ key: BACKUP });
}
