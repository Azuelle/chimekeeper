/**
 * 事件构造辅助（F-06，ADR-017）
 *
 * 纯函数：统一生成 id / 时间戳，并继承对局当前的 round + phase。
 * store 层只负责补上下文后写通持久化，不在此拼接字段。
 */
import { newId } from './id';
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
