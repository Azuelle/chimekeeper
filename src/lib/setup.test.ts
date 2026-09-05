import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseScript } from './scriptParser';
import { baseComposition, adjustedComposition, assignRoles, recommendDemonBluffs } from './setup';
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

describe('adjustedComposition', () => {
  it('含 Baron 时 +2 外来者 -2 镇民', () => {
    const comp = adjustedComposition(7, tbRoles);
    expect(comp).toEqual({ townsfolk: 3, outsider: 2, minion: 1, demon: 1 });
  });
  it('不含 Baron 时保持基础构成', () => {
    const noBaron = tbRoles.filter((r) => r.id !== 'baron');
    expect(adjustedComposition(7, noBaron)).toEqual(baseComposition(7));
  });
});

describe('assignRoles', () => {
  it('分配数量等于玩家人数，阵营构成正确', () => {
    const assigned = assignRoles(tbRoles, 7, fixedRng);
    expect(assigned).not.toBeNull();
    expect(assigned).toHaveLength(7);
    const count = (team: string) => assigned!.filter((r) => r.team === team).length;
    expect(count('demon')).toBe(1);
    expect(count('minion')).toBe(1);
  });

  it('角色池不足时返回 null', () => {
    const onlyOneRole = tbRoles.slice(0, 1);
    expect(assignRoles(onlyOneRole, 7, fixedRng)).toBeNull();
  });
});

describe('recommendDemonBluffs', () => {
  it('推荐 3 个不在场的善良角色', () => {
    const assigned = assignRoles(tbRoles, 7, fixedRng)!;
    const bluffs = recommendDemonBluffs(tbRoles, assigned, fixedRng);
    const assignedIds = new Set(assigned.map((r) => r.id));
    for (const b of bluffs) {
      expect(['townsfolk', 'outsider']).toContain(b.team);
      expect(assignedIds.has(b.id)).toBe(false);
    }
  });
});
