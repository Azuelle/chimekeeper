import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseScript } from './scriptParser';
import { baseComposition, assignRoles, recommendDemonBluffs, setupRoleHints } from './setup';
import type { TeamComposition } from '../types/game';
import type { Role } from '../types/script';

const tbResult = parseScript(readFileSync(join(__dirname, '../../fixtures/official-tool-tb-sample.json'), 'utf-8'));
const tbRoles: Role[] = tbResult.ok ? tbResult.script.roles : [];

// 固定随机源保证可重复
const fixedRng = () => 0.42;

describe('baseComposition', () => {
  it('7 人局 = 5镇民/0外来者/1爪牙/1恶魔', () => {
    expect(baseComposition(7)).toEqual({ townsfolk: 5, outsider: 0, minion: 1, demon: 1 });
  });
  it('人数超出 5-15 返回 null', () => {
    expect(baseComposition(4)).toBeNull();
    expect(baseComposition(16)).toBeNull();
  });
});

describe('setupRoleHints（ADR-008）', () => {
  it('在场 setup 角色高亮 + 调整方向文案', () => {
    const hints = setupRoleHints(tbRoles);
    expect(hints).toHaveLength(1); // 男爵
    expect(hints[0]?.roleId).toBe('baron');
    expect(hints[0]?.hint).toContain('+2外来者');
  });

  it('未知 setup 角色（DIY）给通用提示', () => {
    const diy: Role[] = [
      { id: 'custom_setup_guy', name: '自定义调整角色', team: 'townsfolk', firstNight: 0, otherNight: 0, setup: true },
    ];
    const hints = setupRoleHints(diy);
    expect(hints[0]?.hint).toBe('该角色会调整初始设置，请按其能力说明调整构成');
  });

  it('隐士特例文案', () => {
    const hermit: Role[] = [
      { id: 'hermit', name: '隐士', team: 'outsider', firstNight: 0, otherNight: 0, setup: true },
    ];
    expect(setupRoleHints(hermit)[0]?.hint).toContain('-0~1外来者');
  });
});

describe('assignRoles', () => {
  it('分配数量等于玩家人数，阵营构成正确', () => {
    const assigned = assignRoles(tbRoles, baseComposition(7)!, fixedRng);
    expect(assigned).not.toBeNull();
    expect(assigned).toHaveLength(7);
    const count = (team: string) => assigned!.filter((r) => r.team === team).length;
    expect(count('demon')).toBe(1);
    expect(count('minion')).toBe(1);
  });

  it('角色池不足时返回 null', () => {
    const onlyOneRole = tbRoles.slice(0, 1);
    const sevenPlayerComp: TeamComposition = { townsfolk: 5, outsider: 0, minion: 1, demon: 1 };
    expect(assignRoles(onlyOneRole, sevenPlayerComp, fixedRng)).toBeNull();
  });
});

describe('recommendDemonBluffs', () => {
  it('推荐 3 个不在场的善良角色', () => {
    const assigned = assignRoles(tbRoles, baseComposition(7)!, fixedRng)!;
    const bluffs = recommendDemonBluffs(tbRoles, assigned, fixedRng);
    const assignedIds = new Set(assigned.map((r) => r.id));
    for (const b of bluffs) {
      expect(['townsfolk', 'outsider']).toContain(b.team);
      expect(assignedIds.has(b.id)).toBe(false);
    }
  });
});
