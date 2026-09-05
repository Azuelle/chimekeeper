/**
 * 剧本（Script）数据模型
 *
 * 兼容 bra1n/townsquare 的剧本 JSON 格式，同时宽容国内剧本工具的自定义扩展字段。
 * 解析层（src/lib/scriptParser.ts）使用 Zod 宽松模式：未知字段保留但不校验。
 *
 * @see docs/DATA-MODEL.md
 */

/** 角色阵营 */
export type Team = 'townsfolk' | 'outsider' | 'minion' | 'demon' | 'traveler' | 'fabled' | 'loric';

/** 官方版次 */
export type Edition = 'tb' | 'snv' | 'bmr' | 'custom';

/** 剧本元信息（bra1n 约定：剧本数组首项 id 为 "_meta"） */
export interface ScriptMeta {
  id: '_meta';
  /** 剧本名 */
  name?: string;
  author?: string;
  /** 国内剧本工具常见自定义字段，宽松透传 */
  logo?: string;
  almanac?: string;
  bootlegger?: string[];
  [key: string]: unknown;
}

/** 角色定义 */
export interface Role {
  id: string;
  /** 角色显示名（中文剧本直接为中文） */
  name: string;
  team: Team;
  edition?: Edition;
  /** 能力描述 */
  ability?: string;
  /** 首夜行动顺序，0 = 不行动 */
  firstNight: number;
  firstNightReminder?: string;
  /** 其他夜晚行动顺序，0 = 不行动 */
  otherNight: number;
  otherNightReminder?: string;
  /** 该角色专属的提示标记 */
  reminders?: string[];
  /** 全局提示标记（如"死亡"） */
  remindersGlobal?: string[];
  /** 是否为初始设置相关角色（影响角色池构成，如 Baron） */
  setup?: boolean;
  /** 角色图标 URL 或 data URI */
  image?: string;
  /**
   *  flavor text（bra1n 扩展字段）
   */
  flavor?: string;
  /** 国内剧本工具自定义字段宽容透传 */
  [key: string]: unknown;
}

/**
 * 相克规则（jinx）
 * bra1n 格式：{ id: "jinx", jinx: [{ id: "角色a", target: "角色b", reason: "..." }] }
 * 国内部分工具用 alt_night_order 等字段调整夜晚顺序，解析层需识别并警告。
 */
export interface Jinx {
  id: string;
  target: string;
  reason?: string;
}

export interface ScriptJinxes {
  id: 'jinx';
  jinx: Jinx[];
}

/** 剧本 JSON 顶层 = 数组，首项可为 _meta，其余为角色或相克规则 */
export type ScriptEntry = ScriptMeta | Role | ScriptJinxes;

/** 解析后的剧本（规范化结果，供应用内部使用） */
export interface Script {
  name: string;
  author?: string;
  roles: Role[];
  jinxes: Jinx[];
  /** 解析警告（如未知字段、非标准夜晚顺序覆盖），导入时展示给说书人 */
  warnings: ScriptWarning[];
}

export interface ScriptWarning {
  level: 'info' | 'warning';
  /** i18n key，见 src/i18n */
  code: string;
  /** 插值参数（如角色名） */
  params?: Record<string, string>;
}
