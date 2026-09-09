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

/** 死亡原因（F-05d）：夜晚死亡 / 处决 / 其他 */
export type DeathCause = 'night' | 'execution' | 'other';

/** 实际阵营（单一真相源）：token/皮肤等一律引用此类型（ADR-005） */
export type Alignment = 'good' | 'evil';

/** 座位上的玩家。编号是面向国内环境的核心设计：座位号即身份。 */
export interface Seat {
  /**
   * 座位号 = 椅子锚点（ADR-011）：全场唯一、只增不改不重用；新座位 = 当前最大号+1，
   * 移除后退役。复盘事件全部以此为锚，永不失效。
   */
  seatNumber: number;
  /** 物理位置（ADR-011）：网格/座位圈显示顺序，与编号无关；支持 1 2 3 4 15 5 6 式排列 */
  displayOrder: number;
  /** 玩家昵称（可空，纯编号局） */
  playerName?: string;
  /** 实际抽到的角色（仅说书人可见） */
  roleId?: string;
  /**
   * 实际阵营（ADR-005 玩家卡）：与角色阵营解耦——邪恶/善良旅行者、
   * 麻脸巫婆制造的善良恶魔等由说书人手动改；token 着色以此为准。
   * undefined = 角色未分配（M1 全程 / M2 抽袋前）。
   */
  alignment?: Alignment;
  /** 生死状态 */
  alive: boolean;
  /** 是否有投票权（死亡后一票，旅行者规则等，v1 简化为 boolean） */
  hasVoteToken: boolean;
  /** 旅行者座位（v0.5 预留，ADR-009）：阵营计算/存活数/票数门槛均排除旅行者 */
  isTraveler?: boolean;
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
  /** 座位号高水位（ADR-011）：只增不减，含已退役编号；新座位号 = max(场上最大号, 此高水位)+1，防止退役号复用造成历史事件歧义 */
  seatHighWater: number;
  /**
   * 已退役编号（ADR-011 修订）：不在场上且未启用复用；
   * 经「启用全部退役编号」批量转入 reusePool。
   */
  retiredSeatNumbers: number[];
  /** 复用池：addSeat 优先消费池中最小号，池空才走高水位（ADR-011 修订） */
  reusePool: number[];
  /** 恶魔的三个伪装（不在场的善良角色，说书人设置） */
  demonBluffs: string[];
  /**
   * 说书人手动 +/- 确认后的袋内构成（M2 F-03，ADR-008：不做自动 setup 计算）。
   * undefined = 尚未抽袋。
   */
  composition?: TeamComposition;
  /**
   * 夜单打勾进度（ADR-017）：checked 存 stepKey（lib/nightOrder.stepKey），
   * 进入新的一夜整体重置。
   */
  nightProgress?: { round: number; checked: string[] };
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
