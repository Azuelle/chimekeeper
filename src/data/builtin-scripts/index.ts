/**
 * 内置官方三版剧本（ADR-015）。
 * JSON 产物由 scripts/build-builtin-scripts.mjs 生成（只含 id + 事实字段），
 * 角色名/能力在解析时由内置角色库（roleDb）注水补全，因此中文显示名
 * 依赖 v1.5 F-14 的名称映射层，此前显示英文角色名。
 */
import tb from './tb.json';
import bmr from './bmr.json';
import snv from './snv.json';

export const BUILTIN_SCRIPT_IDS = ['tb', 'bmr', 'snv'] as const;

export type BuiltinScriptId = (typeof BUILTIN_SCRIPT_IDS)[number];

const BUILTIN_JSON: Record<BuiltinScriptId, string> = {
  tb: JSON.stringify(tb),
  bmr: JSON.stringify(bmr),
  snv: JSON.stringify(snv),
};

/** 取内置剧本的 JSON 文本（与文件导入走同一条 parseScript 链路，零特判） */
export function builtinScriptJson(id: BuiltinScriptId): string {
  return BUILTIN_JSON[id];
}
