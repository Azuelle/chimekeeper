import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseScript } from './scriptParser';
import { normalizeRoleId, lookupRole, DB_SIZE } from './roleDb';

const fixture = (name: string) => readFileSync(join(__dirname, '../../fixtures', name), 'utf-8');

describe('内置角色库 hydration（ADR-007）', () => {
  it('角色库覆盖官方 130 角色 + 传奇', () => {
    expect(DB_SIZE).toBeGreaterThanOrEqual(143);
    expect(lookupRole('fortuneteller')?.team).toBe('townsfolk');
    expect(lookupRole('imp')?.otherNight).toBeGreaterThan(0);
  });

  it('ID 规范化：下划线/无下划线写法等价', () => {
    expect(normalizeRoleId('fortune_teller')).toBe(normalizeRoleId('fortuneteller'));
    expect(lookupRole('fortune_teller')?.id).toBe('fortuneteller');
    expect(lookupRole('Poppy-Grower')?.id).toBe('poppygrower');
  });

  it('纯 ID 剧本（botcscripts 风格）可导入并注水成功', () => {
    const result = parseScript(fixture('botcscripts-outed-evil.json'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.script.roles).toHaveLength(25);
    // 注水后应有阵营与夜晚顺序
    const ft = result.script.roles.find((r) => r.id === 'fortuneteller');
    expect(ft?.team).toBe('townsfolk');
    expect(ft?.firstNight).toBeGreaterThan(0);
    expect(ft?.name).toBe('Fortune Teller');
    // 每个被注水的角色都记 warning
    expect(result.script.warnings.filter((w) => w.code === 'scriptImport.warning.hydratedFromDb')).toHaveLength(25);
  });

  it('未知角色 id（库里没有且无 team）→ 可读错误', () => {
    const result = parseScript(JSON.stringify([{ id: '_meta', name: 'x' }, { id: 'nonexistent_role' }]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('scriptImport.error.unknownRole');
    expect(result.error.params?.['role']).toBe('nonexistent_role');
  });

  it('混合剧本：部分条目自带数据、部分纯 ID，均正确处理', () => {
    const result = parseScript(fixture('bra1n-tb-sample.json'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // undertaker 纯 ID → 注水成 Undertaker
    const ut = result.script.roles.find((r) => normalizeRoleId(r.id) === 'undertaker');
    expect(ut?.name).toBe('Undertaker');
    expect(ut?.team).toBe('townsfolk');
    // 僧侣保持中文名（剧本自带优先）
    const monk = result.script.roles.find((r) => r.id === 'monk');
    expect(monk?.name).toBe('僧侣');
  });
});
