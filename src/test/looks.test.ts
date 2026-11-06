import { describe, expect, it } from 'vitest';
import { HEROES, lookState, PETS } from '../domain/world';

const byId = (id: string) => [...HEROES, ...PETS].find((l) => l.id === id)!;

describe('着がえの札(見た目セットが課金だと分かる)', () => {
  it('見た目セットの物は、買うまで paid', () => {
    for (const l of [...HEROES, ...PETS].filter((x) => x.looks)) {
      expect(lookState(l, false, [])).toBe('paid');
      expect(lookState(l, true, [])).toBe('owned');
      // コインで解放した記録があっても、見た目セットの物は課金のまま
      expect(lookState(l, false, [l.id])).toBe('paid');
    }
  });
  it('はじめからの物は free、コインの物は解放まで coin', () => {
    expect(lookState(byId('hood'), false, [])).toBe('free');
    expect(lookState(byId('cat'), false, [])).toBe('free');
    expect(lookState(byId('fox'), false, [])).toBe('coin');
    expect(lookState(byId('fox'), false, ['fox'])).toBe('owned');
    expect(lookState(byId('fox'), true, [])).toBe('coin');
  });
  it('主人公も相棒も、無料で選べる物が1つ以上ある', () => {
    expect(HEROES.some((l) => lookState(l, false, []) === 'free')).toBe(true);
    expect(PETS.some((l) => lookState(l, false, []) === 'free')).toBe(true);
  });
});
