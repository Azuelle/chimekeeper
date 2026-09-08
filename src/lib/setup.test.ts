import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseScript } from './scriptParser';
import { baseComposition, alignmentForRole, assignRoles, recommendDemonBluffs, setupRoleHints } from './setup';
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
    expect(hints.map((h) => h.roleId).sort()).toEqual(['baron', 'drunk']); // 男爵+酒鬼均为 setup 角色
    const baron = hints.find((h) => h.roleId === 'baron');
    expect(baron?.hint).toContain('+2外来者');
    const drunk = hints.find((h) => h.roleId === 'drunk');
    expect(drunk?.hint).toContain('认知覆盖');
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

describe('alignmentForRole（M2 抽袋阵营写入）', () => {
  it('四袋内阵营：镇民/外来者→good，爪牙/恶魔→evil', () => {
    expect(alignmentForRole('townsfolk')).toBe('good');
    expect(alignmentForRole('outsider')).toBe('good');
    expect(alignmentForRole('minion')).toBe('evil');
    expect(alignmentForRole('demon')).toBe('evil');
  });

  it('非袋内阵营（旅行者/传奇/奇遇）返回 null，留给说书人手动指定', () => {
    expect(alignmentForRole('traveler')).toBeNull();
    expect(alignmentForRole('fabled')).toBeNull();
    expect(alignmentForRole('loric')).toBeNull();
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

describe('recommendDemonBluffs（F-03e 默认策略）', () => {
  it('默认 2 镇民 + 1 外来者，全部不在场', () => {
    const assigned = assignRoles(tbRoles, baseComposition(7)!, fixedRng)!;
    const bluffs = recommendDemonBluffs(tbRoles, assigned, fixedRng);
    expect(bluffs).toHaveLength(3);
    expect(bluffs.filter((b) => b.team === 'townsfolk')).toHaveLength(2);
    expect(bluffs.filter((b) => b.team === 'outsider')).toHaveLength(1);
    const assignedIds = new Set(assigned.map((r) => r.id));
    for (const b of bluffs) {
      expect(['townsfolk', 'outsider']).toContain(b.team);
      expect(assignedIds.has(b.id)).toBe(false);
    }
  });

  it('外来者池不足时从镇民补足；善良角色不足 3 返回实际数量', () => {
    // 6 角色小剧本：3 镇民 + 1 外来者 + 1 爪牙 + 1 恶魔，抽 5 人（0 外来者出局）
    const mini: Role[] = [
      { id: 'tf1', name: '镇民一', team: 'townsfolk', firstNight: 0, otherNight: 0 },
      { id: 'tf2', name: '镇民二', team: 'townsfolk', firstNight: 0, otherNight: 0 },
      { id: 'tf3', name: '镇民三', team: 'townsfolk', firstNight: 0, otherNight: 0 },
      { id: 'os1', name: '外来一', team: 'outsider', firstNight: 0, otherNight: 0 },
      { id: 'mn1', name: '爪牙一', team: 'minion', firstNight: 0, otherNight: 0 },
      { id: 'dm1', name: '恶魔一', team: 'demon', firstNight: 0, otherNight: 0 },
    ];
    const assigned = [mini[0]!, mini[1]!, mini[3]!, mini[4]!, mini[5]!]; // tf3 留在场外
    const bluffs = recommendDemonBluffs(mini, assigned, fixedRng);
    // 剩余善良只有 tf3：返回 1 个
    expect(bluffs.map((b) => b.id)).toEqual(['tf3']);
  });
});
