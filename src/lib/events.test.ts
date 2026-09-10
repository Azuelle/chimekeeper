import { describe, it, expect } from 'vitest';
import { createEvent, realRoleId } from './events';
import type { Game } from '../types/game';

const game: Pick<Game, 'id' | 'round' | 'phase'> = {
  id: 'game-1',
  round: 0,
  phase: 'firstNight',
};

describe('createEvent（F-06 事件构造）', () => {
  it('继承对局的 id / round / phase，生成 id 与时间戳', () => {
    const before = Date.now();
    const e = createEvent(game, 'night_action');
    expect(e.gameId).toBe('game-1');
    expect(e.round).toBe(0);
    expect(e.phase).toBe('firstNight');
    expect(e.id).toBeTruthy();
    expect(e.createdAt).toBeGreaterThanOrEqual(before);
  });

  it('seatNumbers / payload 缺省为空，显式传入时透传', () => {
    const minimal = createEvent(game, 'phase_change');
    expect(minimal.seatNumbers).toEqual([]);
    expect(minimal.payload).toEqual({});

    const full = createEvent(game, 'night_action', {
      seatNumbers: [3, 7],
      payload: { roleId: 'fortune_teller', info: '2 3 一好一坏' },
    });
    expect(full.seatNumbers).toEqual([3, 7]);
    expect(full.payload.roleId).toBe('fortune_teller');
  });
});

describe('realRoleId（night_action 真实角色 id）', () => {
  it('角色步骤返回 payload.roleId', () => {
    const e = createEvent(game, 'night_action', { payload: { roleId: 'washerwoman' } });
    expect(realRoleId(e)).toBe('washerwoman');
  });

  it('system:* 伪 id 返回 undefined', () => {
    const e = createEvent(game, 'night_action', { payload: { roleId: 'system:minion_info' } });
    expect(realRoleId(e)).toBeUndefined();
  });

  it('非 night_action 或缺失 roleId 返回 undefined', () => {
    expect(realRoleId(createEvent(game, 'note', { payload: { text: 'x' } }))).toBeUndefined();
    expect(realRoleId(createEvent(game, 'night_action'))).toBeUndefined();
  });
});
