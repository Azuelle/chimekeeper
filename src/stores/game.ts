/**
 * 对局状态（F-02 排座位）：创建对局 + 座位 CRUD。
 * 座位操作全部走 lib/seats.ts 原语（ADR-011 红线），store 只做编排
 * 与不变量维护（seatHighWater 只增不减）。M1 不落盘——持久化属 M2（F-07a）。
 */
import { create } from 'zustand';
import { addSeat, nextSeatNumber, removeSeat, swapOccupants } from '../lib/seats';
import type { Game } from '../types/game';
import type { Script } from '../types/script';

interface GameState {
  game: Game | null;
  /** 创建对局并按人数生成编号座位 1..n */
  createGame(script: Script, playerCount: number): void;
  /** 改昵称；空串 = 清空（纯编号局是合法状态） */
  renameSeat(seatNumber: number, playerName: string): void;
  /** 追加座位（旅行者中途加入等），编号 = 高水位+1 */
  addSeat(): void;
  /** 移除座位：编号退役不重用（ADR-011） */
  removeSeat(seatNumber: number): void;
  /** 换位：原子交换住户字段，编号与位置不动（F-22a） */
  swapSeats(seatA: number, seatB: number): void;
  reset(): void;
}

/** jsdom 环境可能缺 crypto.randomUUID，做一层兜底 */
function newId(): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c) return c.randomUUID();
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useGameStore = create<GameState>()((set, get) => ({
  game: null,

  createGame(script, playerCount) {
    if (!Number.isInteger(playerCount) || playerCount < 1) return;
    // 初始座位也走 addSeat 原语：循环 i 恰为当前高水位（0..n-1）
    let seats: Game['seats'] = [];
    for (let i = 0; i < playerCount; i++) {
      seats = addSeat(seats, i, {});
    }
    const now = Date.now();
    set({
      game: {
        id: newId(),
        scriptSnapshot: { name: script.name, author: script.author, roles: script.roles },
        seats,
        seatHighWater: playerCount,
        demonBluffs: [],
        phase: 'setup',
        round: 0,
        createdAt: now,
        updatedAt: now,
      },
    });
  },

  renameSeat(seatNumber, playerName) {
    const game = get().game;
    if (!game) return;
    const name = playerName.trim();
    const seats = game.seats.map((s) =>
      s.seatNumber === seatNumber ? { ...s, playerName: name.length > 0 ? name : undefined } : s,
    );
    set({ game: { ...game, seats, updatedAt: Date.now() } });
  },

  addSeat() {
    const game = get().game;
    if (!game) return;
    const seatNumber = nextSeatNumber(game.seats, game.seatHighWater);
    const seats = addSeat(game.seats, game.seatHighWater, {});
    set({ game: { ...game, seats, seatHighWater: Math.max(game.seatHighWater, seatNumber), updatedAt: Date.now() } });
  },

  removeSeat(seatNumber) {
    const game = get().game;
    if (!game) return;
    const seats = removeSeat(game.seats, seatNumber);
    if (!seats) return;
    // seatHighWater 不减：退役编号永不复用（ADR-011）
    set({ game: { ...game, seats, updatedAt: Date.now() } });
  },

  swapSeats(seatA, seatB) {
    const game = get().game;
    if (!game) return;
    const seats = swapOccupants(game.seats, seatA, seatB);
    if (!seats) return;
    set({ game: { ...game, seats, updatedAt: Date.now() } });
  },

  reset() {
    set({ game: null });
  },
}));
