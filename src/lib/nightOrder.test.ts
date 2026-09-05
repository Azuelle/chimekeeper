import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseScript } from './scriptParser';
import { buildNightOrder } from './nightOrder';

const tbResult = parseScript(readFileSync(join(__dirname, '../../fixtures/bra1n-tb-sample.json'), 'utf-8'));
const roles = tbResult.ok ? tbResult.script.roles : [];

describe('buildNightOrder', () => {
  it('首夜按 firstNight 升序，排除 0（不行动）', () => {
    const order = buildNightOrder(roles, true);
    expect(order.length).toBeGreaterThan(0);
    for (let i = 1; i < order.length; i++) {
      expect(order[i]!.order).toBeGreaterThanOrEqual(order[i - 1]!.order);
    }
    expect(order.every((o) => o.order > 0)).toBe(true);
  });

  it('其他夜晚按 otherNight 排序', () => {
    const order = buildNightOrder(roles, false);
    const monk = order.find((o) => o.roleId === 'monk');
    expect(monk?.order).toBe(12);
    expect(monk?.reminder).toContain('保护');
  });
});
