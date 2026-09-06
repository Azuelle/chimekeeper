import { describe, expect, it } from 'vitest';
import { ringLayout } from './ringLayout';
import type { GridPos } from './ringLayout';

const cheb = (a: GridPos, b: GridPos) => Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));

describe('ringLayout（ADR-005 圆桌环）', () => {
  it('人数 ≤ 列数：单行平铺', () => {
    const l = ringLayout(5, 8);
    expect(l.rows).toBe(1);
    expect(l.positions.map((p) => p.col)).toEqual([0, 1, 2, 3, 4]);
    expect(l.positions.every((p) => p.row === 0)).toBe(true);
  });

  it('7 人 2 列：两列闭环、末尾单座居左', () => {
    const l = ringLayout(7, 2);
    expect(l.rows).toBe(4);
    expect(l.positions).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
      { row: 3, col: 0 },
      { row: 2, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it('8 人 2 列：整行闭环、无空位', () => {
    const l = ringLayout(8, 2);
    expect(l.rows).toBe(4);
    expect(l.positions).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
      { row: 3, col: 1 },
      { row: 3, col: 0 },
      { row: 2, col: 0 },
      { row: 1, col: 0 },
    ]);
    expect(l.positions.every((p) => p.row >= 0 && p.col >= 0)).toBe(true);
  });

  it('9 人 3 列：顶满行、底部两座收窄', () => {
    const l = ringLayout(9, 3);
    expect(l.positions).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 2, col: 2 },
      { row: 3, col: 2 },
      { row: 3, col: 1 },
      { row: 2, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it('12 人 4 列：上下各 3、rail 3（复现 1 2 3 / … / 9 8 7）', () => {
    const l = ringLayout(12, 4);
    expect(l.rows).toBe(5);
    expect(l.positions).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 3 },
      { row: 2, col: 3 },
      { row: 3, col: 3 },
      { row: 4, col: 3 },
      { row: 4, col: 2 },
      { row: 4, col: 1 },
      { row: 3, col: 0 },
      { row: 2, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it('13 人 4 列：顶 3 / rail 4 / 底部 9 8 居中（复现你的图）', () => {
    const l = ringLayout(13, 4);
    expect(l.rows).toBe(6);
    expect(l.positions).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 3 },
      { row: 2, col: 3 },
      { row: 3, col: 3 },
      { row: 4, col: 3 },
      { row: 5, col: 2 },
      { row: 5, col: 1 },
      { row: 4, col: 0 },
      { row: 3, col: 0 },
      { row: 2, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it('通用不变量：无重复/越界，且阅读顺序相邻（含首尾闭合）', () => {
    for (let n = 3; n <= 15; n++) {
      for (let c = 2; c <= 5; c++) {
        if (n <= c) continue;
        const l = ringLayout(n, c);
        expect(l.positions).toHaveLength(n);
        const seen = new Set(l.positions.map((p) => `${p.row},${p.col}`));
        expect(seen.size).toBe(n); // 无重复
        for (const p of l.positions) {
          expect(p.row).toBeGreaterThanOrEqual(0);
          expect(p.row).toBeLessThan(l.rows);
          expect(p.col).toBeGreaterThanOrEqual(0);
          expect(p.col).toBeLessThan(l.cols);
        }
        for (let i = 0; i < n; i++) {
          const next = l.positions[(i + 1) % n]!;
          expect(cheb(l.positions[i]!, next)).toBeLessThanOrEqual(1); // 相邻（含 1↔n 闭合）
        }
      }
    }
  });
});
