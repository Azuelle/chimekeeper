import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseScript } from '../lib/scriptParser';
import { useGameStore } from './game';

const scriptJson = readFileSync(join(__dirname, '../../fixtures/bra1n-tb-sample.json'), 'utf-8');
const script = (() => {
  const r = parseScript(scriptJson);
  if (!r.ok) throw new Error('fixture 解析失败');
  return r.script;
})();

const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('gameStore.createGame（F-02）', () => {
  it('7 人局：座位编号 1..7、displayOrder 1..7、初始状态齐全', () => {
    store().createGame(script, 7);
    const game = store().game;
    expect(game).not.toBeNull();
    expect(game?.seats.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(game?.seats.map((s) => s.displayOrder)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(game?.seats.every((s) => s.alive && s.hasVoteToken && s.reminderTokens.length === 0)).toBe(true);
    expect(game?.seatHighWater).toBe(7);
    expect(game?.phase).toBe('setup');
    expect(game?.scriptSnapshot.roles.length).toBe(script.roles.length);
  });

  it('非法人数直接拒绝', () => {
    store().createGame(script, 0);
    store().createGame(script, -3);
    store().createGame(script, Number.NaN);
    expect(store().game).toBeNull();
  });
});

describe('gameStore 座位 CRUD（ADR-011）', () => {
  it('昵称：可填可清（纯编号局合法）', () => {
    store().createGame(script, 5);
    store().renameSeat(3, '  阿明  ');
    expect(store().game?.seats.find((s) => s.seatNumber === 3)?.playerName).toBe('阿明');
    store().renameSeat(3, '   ');
    expect(store().game?.seats.find((s) => s.seatNumber === 3)?.playerName).toBeUndefined();
  });

  it('增座 → 高水位推进；删座 → 编号退役不复用', () => {
    store().createGame(script, 5);
    store().addSeat();
    expect(store().game?.seats.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(store().game?.seatHighWater).toBe(6);

    store().removeSeat(6);
    expect(store().game?.seats.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(store().game?.seatHighWater).toBe(6); // 不减

    store().addSeat();
    // 6 号已退役：新座位拿 7，历史事件引用永不歧义
    expect(store().game?.seats.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4, 5, 7]);
    expect(store().game?.seatHighWater).toBe(7);
  });

  it('删不存在的座位 = no-op', () => {
    store().createGame(script, 5);
    store().removeSeat(99);
    expect(store().game?.seats).toHaveLength(5);
  });

  it('换位：住户（昵称）跟着人走，编号与位置不动（F-22a）', () => {
    store().createGame(script, 5);
    store().renameSeat(1, '张三');
    store().renameSeat(3, '李四');
    store().swapSeats(1, 3);
    const seats = store().game?.seats ?? [];
    expect(seats.find((s) => s.seatNumber === 1)?.playerName).toBe('李四');
    expect(seats.find((s) => s.seatNumber === 3)?.playerName).toBe('张三');
    expect(seats.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(seats.map((s) => s.displayOrder)).toEqual([1, 2, 3, 4, 5]);
  });

  it('换位传入不存在的座位 = no-op', () => {
    store().createGame(script, 5);
    store().renameSeat(1, '张三');
    store().swapSeats(1, 99);
    expect(store().game?.seats.find((s) => s.seatNumber === 1)?.playerName).toBe('张三');
  });
});
