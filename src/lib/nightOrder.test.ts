import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseScript } from './scriptParser';
import { buildNightOrder, buildRoleSteps, systemStepOverrideHints } from './nightOrder';

const fixture = (name: string) => readFileSync(join(__dirname, '../../fixtures', name), 'utf-8');

const tbResult = parseScript(fixture('bra1n-tb-sample.json'));
const roles = tbResult.ok ? tbResult.script.roles : [];

describe('buildRoleSteps（角色步骤排序）', () => {
  it('首夜按 firstNight 升序，排除 0（不行动）', () => {
    const order = buildRoleSteps(roles, true);
    expect(order.length).toBeGreaterThan(0);
    for (let i = 1; i < order.length; i++) {
      expect(order[i]!.order).toBeGreaterThanOrEqual(order[i - 1]!.order);
    }
    expect(order.every((o) => o.order > 0)).toBe(true);
  });

  it('其他夜晚按 otherNight 排序', () => {
    const order = buildRoleSteps(roles, false);
    const monk = order.find((o) => o.roleId === 'monk');
    expect(monk?.order).toBe(12);
    expect(monk?.reminder).toContain('保护');
  });
});

describe('buildNightOrder（ADR-006 系统锚点步骤）', () => {
  it('首夜 ≥7 人：黄昏 → 爪牙信息 → 恶魔信息 → 角色 → 黎明', () => {
    const steps = buildNightOrder(roles, true, 7);
    expect(steps[0]).toEqual({ kind: 'system', system: 'dusk' });
    expect(steps[1]).toEqual({ kind: 'system', system: 'minion_info' });
    expect(steps[2]).toEqual({ kind: 'system', system: 'demon_info' });
    expect(steps.at(-1)).toEqual({ kind: 'system', system: 'dawn' });
    expect(steps.some((s) => s.kind === 'role')).toBe(true);
  });

  it('首夜 <7 人：无爪牙/恶魔信息步骤', () => {
    const steps = buildNightOrder(roles, true, 6);
    expect(steps.some((s) => s.kind === 'system' && s.system === 'minion_info')).toBe(false);
    expect(steps.some((s) => s.kind === 'system' && s.system === 'demon_info')).toBe(false);
  });

  it('其他夜晚：黄昏 → 角色 → 黎明，无信息步骤', () => {
    const steps = buildNightOrder(roles, false, 10);
    expect(steps[0]).toEqual({ kind: 'system', system: 'dusk' });
    expect(steps.at(-1)).toEqual({ kind: 'system', system: 'dawn' });
    expect(
      steps.some((s) => s.kind === 'system' && (s.system === 'minion_info' || s.system === 'demon_info')),
    ).toBe(false);
  });
});

describe('systemStepOverrideHints', () => {
  it('罂粟种植者在场时给出改写提示', () => {
    const withPoppy = [
      ...roles,
      { id: 'poppy_grower', name: '罂粟种植者', team: 'townsfolk' as const, firstNight: 0, otherNight: 0 },
    ];
    const hints = systemStepOverrideHints(withPoppy, true);
    expect(hints).toContain('nightOrder.hint.poppyGrower');
    expect(systemStepOverrideHints(roles, true)).toHaveLength(0);
    expect(systemStepOverrideHints(withPoppy, false)).toHaveLength(0);
  });
});
