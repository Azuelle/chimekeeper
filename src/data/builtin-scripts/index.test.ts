import { describe, it, expect } from 'vitest';
import { parseScript } from '../../lib/scriptParser';
import { normalizeRoleId } from '../../lib/roleDb';
import { BUILTIN_SCRIPT_IDS, builtinScriptJson } from './index';
import rawDb from '../official-roles.json';

const db = rawDb as unknown as Array<{ id: string; edition?: string; team: string }>;
const CORE_TEAMS = new Set(['townsfolk', 'outsider', 'minion', 'demon']);

/** 内置剧本必须与角色库按 edition 筛选的结果一致（生成器对账） */
function expectedIds(edition: string): Set<string> {
  return new Set(
    db
      .filter((r) => r.edition === edition && CORE_TEAMS.has(r.team))
      .map((r) => normalizeRoleId(r.id!)),
  );
}

describe('内置官方三版剧本（ADR-015）', () => {
  it.each(BUILTIN_SCRIPT_IDS)('%s 可解析且与角色库 edition 筛选一致', (id) => {
    const result = parseScript(builtinScriptJson(id));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(new Set(result.script.roles.map((r) => normalizeRoleId(r.id)))).toEqual(expectedIds(id));
    expect(result.script.roles.length).toBeGreaterThan(10);
    expect(result.script.name.length).toBeGreaterThan(0);
  });

  it('暗流涌动包含标志性角色', () => {
    const result = parseScript(builtinScriptJson('tb'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = new Set(result.script.roles.map((r) => normalizeRoleId(r.id)));
    expect(ids.has('imp')).toBe(true);
    expect(ids.has('baron')).toBe(true);
    expect(ids.has('empath')).toBe(true);
  });
});
