/**
 * 事件日志（Event Log）数据模型
 *
 * 复盘功能的地基：说书过程中的操作生成结构化事件流，
 * 复盘 = 事件流的渲染与导出；玩家统计（v2）= 事件流的聚合查询。
 *
 * 设计原则：
 * - 事件类型封闭枚举（不许自由扩展，保证可统计）
 * - 每条事件携带 round + phase，天然构成时间线
 * - 涉及玩家一律以 seatNumber 引用
 *
 * @see docs/DATA-MODEL.md
 * ⚠ 修改本文件前必须先更新 docs/DATA-MODEL.md（见 AGENTS.md）
 */

import type { GamePhase } from './game';

/** 事件类型枚举。新增类型 = 一次 ADR + 数据模型文档更新。 */
export type EventType =
  /** 夜晚阶段：某角色被唤醒行动。payload: roleId, info(说书人给的信息摘要，可选) */
  | 'night_action'
  /** 夜晚死亡结算。payload: cause(来源角色id或"execution"等), announced(黎明公布) */
  | 'death'
  /** 白天提名。payload: nominatorSeat, nominatedSeat */
  | 'nomination'
  /** 投票。payload: votesFor(票数), votesNeeded, passed */
  | 'vote'
  /** 处决。payload: died(是否因此死亡，如弄臣存活) */
  | 'execution'
  /** 复活（如教授、茶女邻居等）。 */
  | 'revival'
  /** 角色变化（如哲学家获得能力、pit-hag 变人）。payload: fromRoleId, toRoleId */
  | 'role_change'
  /** 说书人自由备注（判罚、口误修正、精彩发言、F-19 备忘填空等）。payload: text */
  | 'note'
  /** 玩家声称的角色及其发动的能力/获得的信息（F-20）。payload: claimRoleId?, text */
  | 'claim'
  /** 阶段切换（系统自动产生）。 */
  | 'phase_change'
  /** 游戏结束。payload: winningTeam, reason */
  | 'game_end';

export interface GameEvent {
  id: string;
  gameId: string;
  type: EventType;
  /** 第几轮（首夜=0，第一个白天=1） */
  round: number;
  phase: GamePhase;
  /** 主要涉及座位（如被提名者、夜晚死亡者） */
  seatNumbers: number[];
  /** 类型相关的负载，schema 见各 EventType 注释 */
  payload: Record<string, unknown>;
  createdAt: number;
}

/**
 * 复盘导出格式。
 * 由事件流聚合生成，供"一键导出 Markdown/长图"。
 */
export interface GameRecap {
  gameId: string;
  scriptName: string;
  /** 座位表快照：编号 → 昵称/角色 */
  seating: Array<{ seatNumber: number; playerName?: string; roleId?: string }>;
  /** 按轮次组织的时间线 */
  timeline: Array<{
    round: number;
    phase: GamePhase;
    events: GameEvent[];
  }>;
  outcome?: { winningTeam: 'good' | 'evil'; reason?: string };
  generatedAt: number;
}
