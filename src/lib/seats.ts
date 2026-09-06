/**
 * 座位操作原语（ADR-011 锚号体系）。
 *
 * 不变量：seatNumber 是椅子锚点（只增不改不重用，移除即退役）；
 * displayOrder 是物理位置；换位 = 原子交换住户字段，编号与位置不动。
 * 全部纯函数，store 层以单一 action 调用（防状态不同步——竞品教训）。
 */
import type { Seat } from '../types/game';

/**
 * 新座位编号（ADR-011）：高水位计数，只增不重用。
 * 必须传入 Game.seatHighWater——从当前座位推导会复用刚退役的编号，
 * 使历史事件引用歧义（旅行者 6 号离场后，下一个新人不能再拿 6 号）。
 */
export function nextSeatNumber(seats: Seat[], highWaterMark: number): number {
  const currentMax = seats.reduce((max, s) => Math.max(max, s.seatNumber), 0);
  return Math.max(currentMax, highWaterMark) + 1;
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
 * 新增座位（旅行者加入等）：编号 = nextSeatNumber(seats, highWaterMark)，
 * displayOrder 可指定插入位置。
 */
export function addSeat(
  seats: Seat[],
  highWaterMark: number,
  occupant: Omit<Seat, 'seatNumber' | 'displayOrder' | 'alive' | 'hasVoteToken' | 'reminderTokens'> &
    Partial<Pick<Seat, 'alive' | 'hasVoteToken' | 'reminderTokens'>>,
  displayOrder?: number,
): Seat[] {
  return addSeatWithNumber(seats, nextSeatNumber(seats, highWaterMark), occupant, displayOrder);
}

/**
 * 以显式编号新增座位（复用池消费路径，ADR-011 修订）。
 * 前置条件：seatNumber 不与在场座位冲突且未被二次入池——池的完整性由 store 层维护。
 */
export function addSeatWithNumber(
  seats: Seat[],
  seatNumber: number,
  occupant: Omit<Seat, 'seatNumber' | 'displayOrder' | 'alive' | 'hasVoteToken' | 'reminderTokens'> &
    Partial<Pick<Seat, 'alive' | 'hasVoteToken' | 'reminderTokens'>>,
  displayOrder?: number,
): Seat[] {
  if (seats.some((s) => s.seatNumber === seatNumber)) {
    throw new Error(`座位号 ${String(seatNumber)} 已在场，复用池数据不一致`);
  }
  const seat: Seat = {
    alive: true,
    hasVoteToken: true,
    reminderTokens: [],
    ...occupant,
    seatNumber,
    displayOrder: displayOrder ?? nextDisplayOrder(seats),
  };
  return [...seats, seat];
}

/** 从复用池取最小号（ADR-011 修订）。返回 null = 池空，调用方走高水位。 */
export function takePooledSeatNumber(pool: number[]): { seatNumber: number; pool: number[] } | null {
  if (pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => a - b);
  return { seatNumber: sorted[0]!, pool: sorted.slice(1) };
}

/** 「启用全部退役编号」：retired 全部并入池（去重排序）。 */
export function enableAllRetired(retired: number[], pool: number[]): number[] {
  return [...new Set([...pool, ...retired])].sort((a, b) => a - b);
}

/**
 * 平移座位（涟漪式，ADR-005 玩家卡菜单）：
 * 选中住户逐位向目标交换（链式 swapOccupants），其余住户顺延。
 * 例：ABCD 选 A 移到 4 号位 → BCDA。seatNumber 与 displayOrder 均不动。
 * 返回 null = 起止相同 / 座位不存在。
 */
export function rippleShift(seats: Seat[], fromSeatNumber: number, toSeatNumber: number): Seat[] | null {
  if (fromSeatNumber === toSeatNumber) return null;
  const ordered = [...seats].sort((a, b) => a.displayOrder - b.displayOrder);
  const fromIdx = ordered.findIndex((s) => s.seatNumber === fromSeatNumber);
  const toIdx = ordered.findIndex((s) => s.seatNumber === toSeatNumber);
  if (fromIdx === -1 || toIdx === -1) return null;

  let current = fromSeatNumber;
  let result = seats;
  const step = fromIdx < toIdx ? 1 : -1;
  for (let i = fromIdx; i !== toIdx; i += step) {
    const next = ordered[i + step]!.seatNumber;
    const swapped = swapOccupants(result, current, next);
    if (!swapped) return null;
    result = swapped;
    current = next;
  }
  return result;
}

/** 移除座位：编号退役不重用；其余座位编号不动。返回 null 表示座位不存在。 */
export function removeSeat(seats: Seat[], seatNumber: number): Seat[] | null {
  const exists = seats.some((s) => s.seatNumber === seatNumber);
  if (!exists) return null;
  return seats.filter((s) => s.seatNumber !== seatNumber);
}
