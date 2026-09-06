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

describe('gameStore 复用池（ADR-011 修订）', () => {
  it('默认移除 → 编号进退役表，不入池；addSeat 走高水位', () => {
    store().createGame(script, 5);
    store().removeSeat(3);
    expect(store().game?.retiredSeatNumbers).toEqual([3]);
    expect(store().game?.reusePool).toEqual([]);
    store().addSeat();
    expect(store().game?.seats.map((s) => s.seatNumber).sort((a, b) => a - b)).toEqual([1, 2, 4, 5, 6]);
  });

  it('勾选复用移除 → 编号入池；addSeat 消费池中最小号', () => {
    store().createGame(script, 5);
    store().removeSeat(3, true);
    expect(store().game?.retiredSeatNumbers).toEqual([]);
    expect(store().game?.reusePool).toEqual([3]);
    store().addSeat();
    expect(store().game?.seats.map((s) => s.seatNumber).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(store().game?.reusePool).toEqual([]);
  });

  it('池中有多个号 → 取最小；非最小号仍在池中待补', () => {
    store().createGame(script, 5);
    store().removeSeat(2, true);
    store().removeSeat(4, true);
    expect(store().game?.reusePool).toEqual([2, 4]);
    store().addSeat(); // 只补回最小号 2，4 号仍待补
    expect(store().game?.reusePool).toEqual([4]);
    expect(store().game?.seats.map((s) => s.seatNumber).sort((a, b) => a - b)).toEqual([1, 2, 3, 5]);
    store().addSeat(); // 补回 4
    expect(store().game?.reusePool).toEqual([]);
    expect(store().game?.seats.map((s) => s.seatNumber).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('启用全部退役编号：retired → 池，退役表清空', () => {
    store().createGame(script, 5);
    store().removeSeat(2);
    store().removeSeat(4);
    expect(store().game?.retiredSeatNumbers).toEqual([2, 4]);
    store().enableAllRetiredSeats();
    expect(store().game?.retiredSeatNumbers).toEqual([]);
    expect(store().game?.reusePool).toEqual([2, 4]);
    store().enableAllRetiredSeats();
    expect(store().game?.reusePool).toEqual([2, 4]);
  });

  it('池空 + 高水位兜底：消费完池后新号 = max+1', () => {
    store().createGame(script, 4);
    store().removeSeat(2, true);
    store().addSeat();
    store().addSeat();
    expect(store().game?.seats.map((s) => s.seatNumber).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('gameStore.rippleShiftSeat（平移座位，ADR-005）', () => {
  it('ABCD 选 A 移到 4 号位 → BCDA；编号与位置不动', () => {
    store().createGame(script, 4);
    store().renameSeat(1, 'A');
    store().renameSeat(2, 'B');
    store().renameSeat(3, 'C');
    store().renameSeat(4, 'D');
    store().rippleShiftSeat(1, 4);
    const ordered = [...(store().game?.seats ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    expect(ordered.map((s) => s.playerName)).toEqual(['B', 'C', 'D', 'A']);
    expect(ordered.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4]);
  });

  it('起止相同 = no-op', () => {
    store().createGame(script, 3);
    store().renameSeat(1, '张三');
    store().rippleShiftSeat(1, 1);
    expect(store().game?.seats.find((s) => s.seatNumber === 1)?.playerName).toBe('张三');
  });
});
