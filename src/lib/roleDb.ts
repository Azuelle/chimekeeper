/**
 * 内置官方角色数据库（hydration 层）
 *
 * 数据源 = 官方 script tool 仓库 ThePandemoniumInstitute/botc-release
 * （roles.json 事实字段 + nightsheet.json 夜晚顺序），含实验角色与奇遇；
 * bra1n/townsquare 仅提供图标外链 URL 映射与已下架角色兜底。
 * 由 scripts/refresh-role-db.mjs 生成（npm run refresh:roledb，需网络）。
 *
 * 注意：名字与能力文本为英文。中文显示名依赖剧本 JSON 自带数据或
 * v1.5 的 zh 名称映射层（见 PRD F-14）。
 * 图标为运行时外链，不打包再分发（ADR-004）。
 */
import rawDb from '../data/official-roles.json';
import type { Role } from '../types/script';

const db = rawDb as unknown as Role[];

/** ID 规范化：官方生态存在 `fortuneteller` 与 `fortune_teller` 两种写法 */
export function normalizeRoleId(id: string): string {
  return id.toLowerCase().replace(/[_-]/g, '');
}

const dbByNormId = new Map<string, Role>(db.map((r) => [normalizeRoleId(r.id), r]));

/**
 * 官方改名史：旧 id → 现 id（等价匹配）。
 * 如 mephit → mezepheles（"Mephit" 为 Wizards of the Coast 商标，官方为规避而改名）。
 */
const RENAMED_IDS: Record<string, string> = {
  mephit: 'mezepheles',
};

/** 按规范化 id 查询内置角色库（含改名别名） */
export function lookupRole(id: string): Role | undefined {
  const norm = normalizeRoleId(id);
  const renamed = RENAMED_IDS[norm];
  if (renamed) return dbByNormId.get(normalizeRoleId(renamed));
  return dbByNormId.get(norm);
}

export const DB_SIZE = db.length;
