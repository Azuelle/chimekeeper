/**
 * 对局状态：创建对局 + 座位 CRUD + 启动恢复。
 * 座位操作全部走 lib/seats.ts 原语（ADR-011 红线），store 只做编排
 * 与不变量维护（seatHighWater 只增不减）。
 * 持久化（F-07a，ADR-017）：每次变更经 commit() 写通 Dexie（fire-and-forget）；
 * hydrate() 启动恢复 + 连带恢复事件流；reset() 删旧局（级联事件）。
 */
import { create } from 'zustand';
import {
  addSeat,
  addSeatWithNumber,
  nextSeatNumber,
  removeSeat,
  swapOccupants,
  rippleShift,
  takePooledSeatNumber,
  enableAllRetired,
} from '../lib/seats';
import { newId } from '../lib/id';
import { createEvent } from '../lib/events';
import { alignmentForRole } from '../lib/setup';
import { deleteGame, loadCurrentGame, saveGame } from '../persistence/repo';
import { useEventStore } from './events';
import type { Game, TeamComposition } from '../types/game';
import type { Script } from '../types/script';

/** 抽袋结果：座位 → 角色 */
export interface SeatRoleAssignment {
  seatNumber: number;
  roleId: string;
}

/**
 * 座位操作记流水（ADR-011 #4，F-06a）：换位/增删各生成结构化事件。
 * setup 阶段（初次摆桌反复调整）不记录，避免噪音；round/phase 取操作后的对局状态。
 */
function emitSeatEvent(game: Game, type: 'seat_add' | 'seat_remove' | 'seat_swap', payload: Record<string, unknown>): void {
  if (game.phase === 'setup') return;
  useEventStore.getState().append(createEvent(game, type, { payload }));
}

interface GameState {
  game: Game | null;
  /** 启动恢复是否完成（App 挂载 hydrate 后置 true，防止恢复前误判「无对局」） */
  hydrated: boolean;
  /** 创建对局并按人数生成编号座位 1..n */
  createGame(script: Script, playerCount: number): void;
  /** 启动恢复：载入最近对局（含事件流）；无对局时置空 */
  hydrate(): Promise<void>;
  /** 改昵称；空串 = 清空（纯编号局是合法状态） */
  renameSeat(seatNumber: number, playerName: string): void;
  /** 追加座位（旅行者中途加入等），编号优先取复用池最小号，池空走高水位+1 */
  addSeat(): void;
  /**
   * 移除座位（ADR-011 修订）：默认编号退役；
   * reuse=true 时编号入复用池，可被下一个 addSeat 消费。
   */
  removeSeat(seatNumber: number, reuse?: boolean): void;
  /** 「启用全部退役编号」：retired 批量并入复用池 */
  enableAllRetiredSeats(): void;
  /** 换位：原子交换住户字段，编号与位置不动（F-22a） */
  swapSeats(seatA: number, seatB: number): void;
  /**
   * 平移座位（涟漪式，ADR-005）：选中住户逐位交换到目标座位，
   * 其余住户顺延（ABCD 选 A 移到 4 号位 → BCDA）；锚号与位置不动。
   */
  rippleShiftSeat(fromSeat: number, toSeat: number): void;
  /**
   * 抽袋确认（F-03c）：一次性写入全部座位角色 + 实际阵营 + 袋内构成 +
   * 恶魔伪装（单一事务，ADR-011 #5 教训：不做分步状态更新）。
   */
  assignRoleDraw(seatRoles: SeatRoleAssignment[], composition: TeamComposition, demonBluffs: string[]): void;
  /** 修改恶魔伪装（F-03e 手动改，最多 3 个） */
  setDemonBluffs(roleIds: string[]): void;
  /** 手动换角（F-03d）：单座位改角色并同步实际阵营 */
  changeSeatRole(seatNumber: number, roleId: string): void;
  /** 入夜（首夜）：setup → firstNight，round=0，夜单进度初始化；记 phase_change */
  enterFirstNight(): void;
  /** 黎明打勾后推进（F-04d）：夜 → day，round+1；记 phase_change */
  finishNight(): void;
  /** 白天入夜（下一夜）：day → night，round 不变（白天 n 与其后的夜 n+1 共用 round=n）；记 phase_change */
  enterNextNight(): void;
  /** 夜单步骤打勾/取消（ADR-017：nightProgress 持久化；事件由夜单面板维护） */
  toggleNightStep(key: string, checked: boolean): void;
  /** 废弃当前对局：删库（级联事件）+ 清内存 */
  reset(): void;
}

export const useGameStore = create<GameState>()((set, get) => {
  const write = (game: Game): void => {
    set({ game });
    void saveGame(game);
  };

  return {
    game: null,
    hydrated: false,

    createGame(script, playerCount) {
      if (!Number.isInteger(playerCount) || playerCount < 1) return;
      // 初始座位也走 addSeat 原语：循环 i 恰为当前高水位（0..n-1）
      let seats: Game['seats'] = [];
      for (let i = 0; i < playerCount; i++) {
        seats = addSeat(seats, i, {});
      }
      const now = Date.now();
      useEventStore.getState().clear();
      write({
        id: newId(),
        scriptSnapshot: { name: script.name, author: script.author, roles: script.roles },
        seats,
        seatHighWater: playerCount,
        retiredSeatNumbers: [],
        reusePool: [],
        demonBluffs: [],
        phase: 'setup',
        round: 0,
        createdAt: now,
        updatedAt: now,
      });
    },

    async hydrate() {
      const game = await loadCurrentGame();
      if (game) await useEventStore.getState().hydrate(game.id);
      else useEventStore.getState().clear();
      set({ game, hydrated: true });
    },

    renameSeat(seatNumber, playerName) {
      const game = get().game;
      if (!game) return;
      const name = playerName.trim();
      const seats = game.seats.map((s) =>
        s.seatNumber === seatNumber ? { ...s, playerName: name.length > 0 ? name : undefined } : s,
      );
      write({ ...game, seats, updatedAt: Date.now() });
    },

    addSeat() {
      const game = get().game;
      if (!game) return;
      // 复用池优先（ADR-011 修订）：取最小号；池空走高水位
      const pooled = takePooledSeatNumber(game.reusePool);
      const seatNumber = pooled?.seatNumber ?? nextSeatNumber(game.seats, game.seatHighWater);
      const seats = addSeatWithNumber(game.seats, seatNumber, {});
      const next: Game = {
        ...game,
        seats,
        reusePool: pooled?.pool ?? game.reusePool,
        // 高水位只增不减：池中取号（可能 < 高水位）不影响，新号则推进
        seatHighWater: Math.max(game.seatHighWater, seatNumber),
        updatedAt: Date.now(),
      };
      write(next);
      emitSeatEvent(next, 'seat_add', { seatNumber });
    },

    removeSeat(seatNumber, reuse = false) {
      const game = get().game;
      if (!game) return;
      const seats = removeSeat(game.seats, seatNumber);
      if (!seats) return;
      let next: Game;
      if (reuse) {
        // 入复用池：编号不进退役表（ADR-011 修订），可被下一个 addSeat 消费
        next = { ...game, seats, reusePool: [...game.reusePool, seatNumber], updatedAt: Date.now() };
      } else {
        next = {
          ...game,
          seats,
          retiredSeatNumbers: [...game.retiredSeatNumbers, seatNumber],
          updatedAt: Date.now(),
        };
      }
      write(next);
      emitSeatEvent(next, 'seat_remove', { seatNumber, reuse });
    },

    enableAllRetiredSeats() {
      const game = get().game;
      if (!game || game.retiredSeatNumbers.length === 0) return;
      write({
        ...game,
        reusePool: enableAllRetired(game.retiredSeatNumbers, game.reusePool),
        retiredSeatNumbers: [],
        updatedAt: Date.now(),
      });
    },

    swapSeats(seatA, seatB) {
      const game = get().game;
      if (!game) return;
      const seats = swapOccupants(game.seats, seatA, seatB);
      if (!seats) return;
      const next = { ...game, seats, updatedAt: Date.now() };
      write(next);
      emitSeatEvent(next, 'seat_swap', { seatA, seatB });
    },

    rippleShiftSeat(fromSeat, toSeat) {
      const game = get().game;
      if (!game) return;
      const seats = rippleShift(game.seats, fromSeat, toSeat);
      if (!seats) return;
      const next = { ...game, seats, updatedAt: Date.now() };
      write(next);
      // 涟漪 = 链式换位，整体记一条（ADR-011 #4）
      emitSeatEvent(next, 'seat_swap', { seatA: fromSeat, seatB: toSeat, ripple: true });
    },

    assignRoleDraw(seatRoles, composition, demonBluffs) {
      const game = get().game;
      if (!game || game.phase !== 'setup') return;
      const roleById = new Map(game.scriptSnapshot.roles.map((r) => [r.id, r]));
      const bySeat = new Map(seatRoles.map((sr) => [sr.seatNumber, sr.roleId]));
      const seats = game.seats.map((s) => {
        const roleId = bySeat.get(s.seatNumber);
        if (roleId === undefined) return s;
        const team = roleById.get(roleId)?.team;
        const alignment = team ? alignmentForRole(team) : null;
        return { ...s, roleId, alignment: alignment ?? undefined };
      });
      write({
        ...game,
        seats,
        composition,
        demonBluffs: demonBluffs.slice(0, 3),
        updatedAt: Date.now(),
      });
    },

    setDemonBluffs(roleIds) {
      const game = get().game;
      if (!game) return;
      write({ ...game, demonBluffs: roleIds.slice(0, 3), updatedAt: Date.now() });
    },

    changeSeatRole(seatNumber, roleId) {
      const game = get().game;
      if (!game) return;
      const team = game.scriptSnapshot.roles.find((r) => r.id === roleId)?.team;
      const alignment = team ? alignmentForRole(team) : null;
      const seats = game.seats.map((s) =>
        s.seatNumber === seatNumber ? { ...s, roleId, alignment: alignment ?? undefined } : s,
      );
      write({ ...game, seats, updatedAt: Date.now() });
    },

    enterFirstNight() {
      const game = get().game;
      if (!game || game.phase !== 'setup') return;
      const next: Game = {
        ...game,
        phase: 'firstNight',
        round: 0,
        nightProgress: { round: 0, checked: [] },
        updatedAt: Date.now(),
      };
      write(next);
      useEventStore.getState().append(
        createEvent(next, 'phase_change', { payload: { from: 'setup', to: 'firstNight' } }),
      );
    },

    finishNight() {
      const game = get().game;
      if (!game || (game.phase !== 'firstNight' && game.phase !== 'night')) return;
      const next: Game = {
        ...game,
        phase: 'day',
        round: game.round + 1,
        nightProgress: undefined,
        updatedAt: Date.now(),
      };
      write(next);
      useEventStore.getState().append(
        createEvent(next, 'phase_change', { payload: { from: game.phase, to: 'day' } }),
      );
    },

    enterNextNight() {
      const game = get().game;
      if (!game || game.phase !== 'day') return;
      // round 不变：白天 n 与其后的夜 n+1 共用 round=n，首个白天=1（events.ts 语义）
      const next: Game = {
        ...game,
        phase: 'night',
        nightProgress: { round: game.round, checked: [] },
        updatedAt: Date.now(),
      };
      write(next);
      useEventStore.getState().append(
        createEvent(next, 'phase_change', { payload: { from: 'day', to: 'night' } }),
      );
    },

    toggleNightStep(key, checked) {
      const game = get().game;
      if (!game || (game.phase !== 'firstNight' && game.phase !== 'night')) return;
      const cur =
        game.nightProgress && game.nightProgress.round === game.round
          ? game.nightProgress
          : { round: game.round, checked: [] };
      const set = new Set(cur.checked);
      if (checked) set.add(key);
      else set.delete(key);
      write({ ...game, nightProgress: { round: cur.round, checked: [...set] }, updatedAt: Date.now() });
    },

    reset() {
      const old = get().game;
      useEventStore.getState().clear();
      set({ game: null });
      if (old) void deleteGame(old.id);
    },
  };
});
