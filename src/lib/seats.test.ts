import { describe, it, expect } from 'vitest';
import { nextSeatNumber, swapOccupants, addSeat, removeSeat } from './seats';
import type { Seat } from '../types/game';

const seat = (n: number, name: string, roleId: string, extra: Partial<Seat> = {}): Seat => ({
  seatNumber: n,
  displayOrder: n,
  playerName: name,
  roleId,
  alive: true,
  hasVoteToken: true,
  reminderTokens: [],
  ...extra,
});

// 模拟线下场景：4 号后插入旅行者 15 号（1 2 3 4 15 5 6 … 14），高水位 = 15
const game15 = (): Seat[] => [
  seat(1, '小明', 'washerwoman'),
  seat(2, '小红', 'librarian'),
  seat(3, '小刚', 'monk'),
  seat(4, '小美', 'poisoner'),
  seat(15, '小旅', 'matron', { isTraveler: true, displayOrder: 5 }),
  seat(5, '阿强', 'imp', { displayOrder: 6 }),
];
const HW = 15;

describe('nextSeatNumber（锚号只增不重用，高水位）', () => {
  it('含高位旅行者号时新号 = max+1', () => {
    expect(nextSeatNumber(game15(), HW)).toBe(16);
  });
  it('高水位覆盖已移除的编号：即使 15 号已退役，新号仍是 16', () => {
    const removed = removeSeat(game15(), 15)!;
    expect(nextSeatNumber(removed, HW)).toBe(16); // 不回收到 15
  });
  it('空桌 = 1', () => {
    expect(nextSeatNumber([], 0)).toBe(1);
  });
});

describe('swapOccupants（女舍监换位）', () => {
  it('编号与位置不动，住户字段全量交换', () => {
    const before = game15();
    // 3号小刚(monk, 带提示标记) 与 5号阿强(imp) 换位
    before[2]!.reminderTokens = [{ label: '被保护' }];
    const after = swapOccupants(before, 3, 5)!;

    const s3 = after.find((s) => s.seatNumber === 3)!;
    const s5 = after.find((s) => s.seatNumber === 5)!;
    // 编号/位置不动
    expect(s3.displayOrder).toBe(3);
    expect(s5.displayOrder).toBe(6);
    // 住户整体交换：角色、名字、提示标记
    expect(s3.roleId).toBe('imp');
    expect(s3.playerName).toBe('阿强');
    expect(s3.reminderTokens).toHaveLength(0);
    expect(s5.roleId).toBe('monk');
    expect(s5.playerName).toBe('小刚');
    expect(s5.reminderTokens[0]?.label).toBe('被保护');
  });

  it('死亡状态与票 token 随人走', () => {
    const before = game15();
    before[2]!.alive = false;
    before[2]!.hasVoteToken = false;
    const after = swapOccupants(before, 3, 4)!;
    expect(after.find((s) => s.seatNumber === 4)!.alive).toBe(false);
    expect(after.find((s) => s.seatNumber === 3)!.alive).toBe(true);
  });

  it('座位不存在或相同返回 null', () => {
    expect(swapOccupants(game15(), 3, 99)).toBeNull();
    expect(swapOccupants(game15(), 3, 3)).toBeNull();
  });
});

describe('addSeat / removeSeat（旅行者进出）', () => {
  it('新座位编号 = max+1，可插中间', () => {
    const after = addSeat(game15(), HW, { playerName: '新旅', roleId: 'bureaucrat', isTraveler: true }, 5.5);
    const added = after.find((s) => s.playerName === '新旅')!;
    expect(added.seatNumber).toBe(16); // 不复用、不顺序填补
    expect(added.isTraveler).toBe(true);
  });

  it('移除后编号退役：后续新增不复用旧号（高水位保护）', () => {
    const removed = removeSeat(game15(), 15)!;
    expect(removed).toHaveLength(5);
    const after = addSeat(removed, HW, { playerName: '又一位', roleId: 'scapegoat', isTraveler: true });
    expect(after.find((s) => s.playerName === '又一位')!.seatNumber).toBe(16); // 不是 15
  });

  it('低位退役同样保护：移除 3 号后新号不回填 3', () => {
    const removed = removeSeat(game15(), 3)!;
    const after = addSeat(removed, HW, { playerName: '补位者', roleId: 'scapegoat' });
    expect(after.find((s) => s.playerName === '补位者')!.seatNumber).toBe(16); // 不是 3 也不是 6
  });

  it('移除不存在的座位返回 null', () => {
    expect(removeSeat(game15(), 99)).toBeNull();
  });
});
