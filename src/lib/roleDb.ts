/**
 * 内置官方角色数据库（hydration 层）
 *
 * 背景：官方 script tool / botcscripts 生态的剧本 JSON 只有角色 id（无名字、阵营、
 * 夜晚顺序），导入时必须用本地角色库补全。数据源为社区事实标准数据
 * （bra1n/townsquare 的 roles.json + fabled.json，130 官方角色 + 13 传奇），
 * 仅保留事实字段（阵营/夜晚顺序数值/提示标记名/英文角色名），
 * 图标为运行时外链，不打包再分发（ADR-004）。
 *
 * 注意：名字与能力文本为英文。中文显示名依赖剧本 JSON 自带数据或
 * v1.5 的 zh 名称映射层（见 PRD F-14）。
 */
import rawDb from '../data/official-roles.json';
import type { Role } from '../types/script';

const db = rawDb as unknown as Role[];

/** ID 规范化：官方生态存在 `fortuneteller` 与 `fortune_teller` 两种写法 */
export function normalizeRoleId(id: string): string {
  return id.toLowerCase().replace(/[_-]/g, '');
}

const dbByNormId = new Map<string, Role>(db.map((r) => [normalizeRoleId(r.id), r]));

/** 按规范化 id 查询内置角色库 */
export function lookupRole(id: string): Role | undefined {
  return dbByNormId.get(normalizeRoleId(id));
}

export const DB_SIZE = db.length;
