/**
 * 事件构造辅助（F-06，ADR-017）
 *
 * 纯函数：统一生成 id / 时间戳，并继承对局当前的 round + phase。
 * store 层只负责补上下文后写通持久化，不在此拼接字段。
 */
import { newId } from './id';
import { SYSTEM_ROLE_PREFIX } from './nightOrder';
import type { EventType, GameEvent } from '../types/events';
import type { Game } from '../types/game';

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
 * 从事件取"真实角色 id"（ADR-018 / F-06）：`night_action` 的 `payload.roleId`
 * 可能是 `system:*` 系统锚点伪 id，不映射任何角色，此时返回 `undefined`。
 * 统一渲染层（Timeline）与文本层的判断，避免各自解析 payload 结构。
 */
export function realRoleId(event: GameEvent): string | undefined {
  if (event.type !== 'night_action') return undefined;
  const id = event.payload.roleId;
  return typeof id === 'string' && !id.startsWith(SYSTEM_ROLE_PREFIX) ? id : undefined;
}
