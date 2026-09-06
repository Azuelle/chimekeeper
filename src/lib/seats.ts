/**
 * 座位操作原语（ADR-011 锚号体系）。
 *
 * 不变量：seatNumber 是椅子锚点（只增不改不重用，移除即退役）；
 * displayOrder 是物理位置；换位 = 原子交换住户字段，编号与位置不动。
 * 全部纯函数，store 层以单一 action 调用（防状态不同步——竞品教训）。
 */
import type { Seat } from '../types/game';

/** 新座位编号 = 当前最大号 + 1（含已退役编号的残留时不回收） */
export function nextSeatNumber(seats: Seat[]): number {
  return seats.reduce((max, s) => Math.max(max, s.seatNumber), 0) + 1;
}

/** 下一个 displayOrder（追加到末尾；插入中间由调用方指定后重排） */
export function nextDisplayOrder(seats: Seat[]): number {
  return seats.reduce((max, s) => Math.max(max, s.displayOrder), 0) + 1;
}

/**
 * 换位：原子交换两个座位的全部住户字段。
 * 住户字段 = 除 seatNumber / displayOrder 外的一切（昵称/角色/生死/票token/
 * 提示标记/旅行者标记）。编号留在椅子上，人（连同所有状态）换椅子。
 */
export function swapOccupants(seats: Seat[], seatA: number, seatB: number): Seat[] | null {
  const a = seats.find((s) => s.seatNumber === seatA);
  const b = seats.find((s) => s.seatNumber === seatB);
  if (!a || !b || a === b) return null;

  const { seatNumber: _sa, displayOrder: _da, ...occupantA } = a;
  const { seatNumber: _sb, displayOrder: _db, ...occupantB } = b;

  return seats.map((s) => {
    if (s.seatNumber === seatA) return { ...occupantB, seatNumber: a.seatNumber, displayOrder: a.displayOrder };
    if (s.seatNumber === seatB) return { ...occupantA, seatNumber: b.seatNumber, displayOrder: b.displayOrder };
    return s;
  });
}

/**
 * 新增座位（旅行者加入等）：编号 = nextSeatNumber，displayOrder 可指定插入位置。
 */
export function addSeat(
  seats: Seat[],
  occupant: Omit<Seat, 'seatNumber' | 'displayOrder' | 'alive' | 'hasVoteToken' | 'reminderTokens'> &
    Partial<Pick<Seat, 'alive' | 'hasVoteToken' | 'reminderTokens'>>,
  displayOrder?: number,
): Seat[] {
  const seat: Seat = {
    alive: true,
    hasVoteToken: true,
    reminderTokens: [],
    ...occupant,
    seatNumber: nextSeatNumber(seats),
    displayOrder: displayOrder ?? nextDisplayOrder(seats),
  };
  return [...seats, seat];
}

/** 移除座位：编号退役不重用；其余座位编号不动。返回 null 表示座位不存在。 */
export function removeSeat(seats: Seat[], seatNumber: number): Seat[] | null {
  const exists = seats.some((s) => s.seatNumber === seatNumber);
  if (!exists) return null;
  return seats.filter((s) => s.seatNumber !== seatNumber);
}
