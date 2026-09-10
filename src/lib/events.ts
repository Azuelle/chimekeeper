/**
 * 事件构造辅助（F-06，ADR-017）
 *
 * 纯函数：统一生成 id / 时间戳，并继承对局当前的 round + phase。
 * store 层只负责补上下文后写通持久化，不在此拼接字段。
 */
import { newId } from './id';
import { systemStepKind } from './nightOrder';
import type { EventType, GameEvent } from '../types/events';
import type { Game } from '../types/game';

/** 时间线/复盘中作为进度元事件折叠的事件类型（阶段标题已表达） */
export const HIDDEN_EVENT_TYPES: ReadonlySet<EventType> = new Set(['phase_change']);

export interface CreateEventOptions {
  /** 涉及座位编号（默认空） */
  seatNumbers?: number[];
  /** 类型相关负载（默认空对象） */
  payload?: Record<string, unknown>;
}

/**
 * 构造一条结构化事件。
 * @param game 取 id / round / phase 的对局快照（通常是事件发生**后**的最新状态，
 *             phase_change 等阶段类事件记录切换后的新阶段）
 */
export function createEvent(
  game: Pick<Game, 'id' | 'round' | 'phase'>,
  type: EventType,
  options: CreateEventOptions = {},
): GameEvent {
  return {
    id: newId(),
    gameId: game.id,
    type,
    round: game.round,
    phase: game.phase,
    seatNumbers: options.seatNumbers ?? [],
    payload: options.payload ?? {},
    createdAt: Date.now(),
  };
}

/**
 * 从事件流推导某座位当前的生死状态（数组末位的死亡/复活事件即最新，数组为追加序/渲染序）。
 * 用于生死事件删除/撤销后回写 Game 状态；无任何生死事件时视为存活（默认状态）。
 */
export function resolveSeatAlive(events: GameEvent[], seatNumber: number): boolean {
  let latest: GameEvent | undefined;
  for (const e of events) {
    if ((e.type === 'death' || e.type === 'revival') && e.seatNumbers.includes(seatNumber)) {
      latest = e;
    }
  }
  return latest === undefined || latest.type === 'revival';
}

/** `night_action` 的原始 `payload.roleId`（含 `system:*` 伪 id）；其他事件或缺失 → undefined */
export function nightActionRoleId(event: GameEvent): string | undefined {
  if (event.type !== 'night_action') return undefined;
  const id = event.payload.roleId;
  return typeof id === 'string' ? id : undefined;
}

/**
 * 从事件取"真实角色 id"（ADR-018 / F-06）：`night_action` 的 `payload.roleId`
 * 可能是 `system:*` 系统锚点伪 id，不映射任何角色，此时返回 `undefined`。
 * 渲染层取角色配图用；文本层另用 `nightActionRoleId` + `systemStepKind` 解析显示名。
 */
export function realRoleId(event: GameEvent): string | undefined {
  const id = nightActionRoleId(event);
  return id !== undefined && systemStepKind(id) === undefined ? id : undefined;
}
