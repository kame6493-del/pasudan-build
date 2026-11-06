import { describe, expect, it } from 'vitest';
import { clockPause, clockRead, clockResume, clockStart } from '../domain/review';

describe('問題の時計(見返し中は止まる)', () => {
  it('動いている間は時間が進む', () => {
    const c = clockStart(1000);
    expect(clockRead(c, 4000)).toBe(3);
  });
  it('止めている間は進まず、戻ったら続きから進む', () => {
    let c = clockStart(0);
    c = clockPause(c, 5000); // 5秒で見返しへ
    expect(clockRead(c, 5000)).toBe(5);
    expect(clockRead(c, 65000)).toBe(5); // 1分見返しても5秒のまま
    c = clockResume(c, 65000);
    expect(clockRead(c, 67000)).toBe(7);
  });
  it('止める・戻すを重ねても二重に数えない', () => {
    let c = clockStart(0);
    c = clockPause(c, 2000);
    c = clockPause(c, 9000);
    c = clockResume(c, 10000);
    c = clockResume(c, 12000);
    expect(clockRead(c, 13000)).toBe(5);
  });
});
