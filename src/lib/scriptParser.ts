/**
 * 剧本 JSON 宽松解析器（ADR-003）
 *
 * 基准格式：bra1n/townsquare。未知字段透传并记 warning，
 * 必需字段缺失给中文可读错误（经 i18n code，UI 层渲染）。
 */
import { z } from 'zod';
import type { Edition, Role, Script, ScriptWarning, Team } from '../types/script';
import { lookupRole } from './roleDb';

const TEAMS: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric'];

const roleSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
    team: z.string().optional(),
    edition: z.string().optional(),
    ability: z.string().optional(),
    firstNight: z.number().optional(),
    firstNightReminder: z.string().optional(),
    otherNight: z.number().optional(),
    otherNightReminder: z.string().optional(),
    reminders: z.array(z.string()).optional(),
    remindersGlobal: z.array(z.string()).optional(),
    setup: z.boolean().optional(),
    image: z.string().optional(),
    flavor: z.string().optional(),
  })
  .passthrough();

const jinxesSchema = z
  .object({
    id: z.literal('jinx'),
    jinx: z.array(z.object({ id: z.string(), target: z.string(), reason: z.string().optional() }).passthrough()),
  })
  .passthrough();

const metaSchema = z.object({ id: z.literal('_meta') }).passthrough();

export type ParseResult =
  | { ok: true; script: Script }
  | { ok: false; error: { code: string; params?: Record<string, string> } };

/** 解析剧本 JSON 文本。永不抛异常——所有失败走 ParseResult。 */
export function parseScript(jsonText: string): ParseResult {
  let raw: unknown;
  try {
    // Windows 工具导出的文件常带 UTF-8 BOM，JSON.parse 不认，先剥掉（ADR-003 宽容）
    raw = JSON.parse(jsonText.replace(/^\uFEFF/, ''));
  } catch {
    return { ok: false, error: { code: 'scriptImport.error.invalidJson' } };
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: { code: 'scriptImport.error.notArray' } };
  }

  const warnings: ScriptWarning[] = [];
  let name = '';
  let author: string | undefined;
  const roles: Role[] = [];
  let jinxes: Script['jinxes'] = [];

  for (const [index, entry] of raw.entries()) {
    const metaTry = metaSchema.safeParse(entry);
    if (metaTry.success && index === 0) {
      const m = metaTry.data;
      name = typeof m['name'] === 'string' ? (m['name'] as string) : '';
      author = typeof m['author'] === 'string' ? (m['author'] as string) : undefined;
      const known = new Set(['id', 'name', 'author']);
      for (const k of Object.keys(m)) {
        if (!known.has(k)) {
          warnings.push({ level: 'info', code: 'scriptImport.warning.customMetaField', params: { field: k } });
        }
      }
      continue;
    }

    const jinxTry = jinxesSchema.safeParse(entry);
    if (jinxTry.success) {
      jinxes = jinxTry.data.jinx.map((j) => ({ id: j.id, target: j.target, reason: j.reason }));
      continue;
    }

    const roleTry = roleSchema.safeParse(entry);
    if (!roleTry.success) {
      return {
        ok: false,
        error: { code: 'scriptImport.error.invalidRole', params: { index: String(index + 1) } },
      };
    }
    const r = roleTry.data;

    // 官方 script tool / botcscripts 生态：条目可能只有 id（无 team/name/夜晚顺序）。
    // 尝试内置角色库注水（ADR-007）：剧本自带数据优先，缺失字段从内置库补全。
    const builtin = lookupRole(r.id);
    const usedDb = builtin !== undefined && (!r.team || !r.name);
    const team = r.team ?? builtin?.team;
    if (!team || !TEAMS.includes(team as Team)) {
      return {
        ok: false,
        error: team
          ? { code: 'scriptImport.error.unknownTeam', params: { role: r.name ?? r.id, team } }
          : { code: 'scriptImport.error.unknownRole', params: { role: r.id } },
      };
    }

    const roleName = r.name ?? builtin?.name ?? r.id;
    const firstNight = r.firstNight ?? builtin?.firstNight ?? 0;
    const otherNight = r.otherNight ?? builtin?.otherNight ?? 0;
    if (usedDb) {
      warnings.push({
        level: 'info',
        code: 'scriptImport.warning.hydratedFromDb',
        params: { role: roleName },
      });
    }

    roles.push({
      ...r,
      name: roleName,
      team: team as Team,
      edition: r.edition as Edition | undefined,
      firstNight,
      otherNight,
      reminders: r.reminders ?? builtin?.reminders,
      remindersGlobal: r.remindersGlobal ?? builtin?.remindersGlobal,
      setup: r.setup ?? builtin?.setup,
    });
  }

  if (roles.length === 0) {
    return { ok: false, error: { code: 'scriptImport.error.noRoles' } };
  }

  return { ok: true, script: { name, author, roles, jinxes, warnings } };
}
