/**
 * 对局（Game）数据模型
 *
 * 一场线下对局的完整状态：座位、角色分配、当前阶段。
 * 持久化于 IndexedDB（src/persistence/），应用被杀后台后可完整恢复。
 *
 * @see docs/DATA-MODEL.md
 */

import type { Role } from './script';

/** 游戏阶段 */
export type GamePhase = 'setup' | 'firstNight' | 'day' | 'night' | 'ended';

/** 座位上的玩家。编号是面向国内环境的核心设计：座位号即身份。 */
export interface Seat {
  /** 座位号（从 1 开始，顺时针），全场唯一，复盘记录以此为锚 */
  seatNumber: number;
  /** 玩家昵称（可空，纯编号局） */
  playerName?: string;
  /** 实际抽到的角色（仅说书人可见） */
  roleId?: string;
  /** 生死状态 */
  alive: boolean;
  /** 是否有投票权（死亡后一票，旅行者规则等，v1 简化为 boolean） */
  hasVoteToken: boolean;
  /** 挂在该座位上的提示标记 */
  reminderTokens: ReminderToken[];
}

export interface ReminderToken {
  /** 标记文本，如 "被保护"、"中毒" */
  label: string;
  /** 来源角色 id（可选，如该标记由僧侣能力产生） */
  sourceRoleId?: string;
}

/** 阵营分配结果（按官方人数表） */
export interface TeamComposition {
  townsfolk: number;
  outsider: number;
  minion: number;
  demon: number;
}

export interface Game {
  id: string;
  /** 使用的剧本快照（存完整数据而非引用，剧本后续被删/改不影响历史对局） */
  scriptSnapshot: {
    name: string;
    author?: string;
    roles: Role[];
  };
  seats: Seat[];
  /** 恶魔的三个伪装（不在场的善良角色，说书人设置） */
  demonBluffs: string[];
  phase: GamePhase;
  /** 当前是第几个白天/夜晚（首夜为 night 0） */
  round: number;
  createdAt: number;
  updatedAt: number;
  /** 结局（ended 阶段填写） */
  outcome?: {
    winningTeam: 'good' | 'evil';
    reason?: string;
  };
}
