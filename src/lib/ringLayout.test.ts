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

  it('单列（cols=1）且人数>1：退化为单列竖排、无重复坐标', () => {
    const l = ringLayout(5, 1);
    expect(l.rows).toBe(5);
    expect(l.positions).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 3, col: 0 },
      { row: 4, col: 0 },
    ]);
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
  });

  it('9 人 3 列：顶满行、底部两座收窄（不变）', () => {
    const l = ringLayout(9, 3);
    expect(l.rows).toBe(4);
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

  it('10 人 3 列：顶满行、rail 2、底整行（省一行）', () => {
    const l = ringLayout(10, 3);
    expect(l.rows).toBe(4);
    expect(l.positions).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 2, col: 2 },
      { row: 3, col: 2 },
      { row: 3, col: 1 },
      { row: 3, col: 0 },
      { row: 2, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it('12 人 4 列：顶行铺满、4 行闭环（去掉右上空格）', () => {
    const l = ringLayout(12, 4);
    expect(l.rows).toBe(4);
    expect(l.positions).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 1, col: 3 },
      { row: 2, col: 3 },
      { row: 3, col: 3 },
      { row: 3, col: 2 },
      { row: 3, col: 1 },
      { row: 3, col: 0 },
      { row: 2, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it('13 人 4 列：顶行铺满、5 行（省一行，只剩左下空）', () => {
    const l = ringLayout(13, 4);
    expect(l.rows).toBe(5);
    expect(l.positions).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
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

  it('15 人 5 列：顶满行、rail 3、底 4（省一行）', () => {
    const l = ringLayout(15, 5);
    expect(l.rows).toBe(5);
    expect(l.positions).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
      { row: 1, col: 4 },
      { row: 2, col: 4 },
      { row: 3, col: 4 },
      { row: 4, col: 4 },
      { row: 4, col: 3 },
      { row: 4, col: 2 },
      { row: 4, col: 1 },
      { row: 3, col: 0 },
      { row: 2, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it('通用不变量：无重复/越界；顺读相邻；人数能成环（n ≥ 2C-1）时首尾闭合', () => {
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
        for (let i = 0; i < n - 1; i++) {
          expect(cheb(l.positions[i]!, l.positions[i + 1]!)).toBeLessThanOrEqual(1);
        }
        // 人数足够围成一圈时，n 与 1 也相邻
        if (n >= 2 * c - 1) {
          expect(cheb(l.positions[n - 1]!, l.positions[0]!)).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
