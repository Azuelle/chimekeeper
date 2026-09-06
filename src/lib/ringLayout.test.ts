import { describe, it, expect } from 'vitest';
import { ringLayout } from './ringLayout';

describe('ringLayout（ADR-005 矩形环）', () => {
  it('人数 ≤ 列数：单行', () => {
    const l = ringLayout(3, 8);
    expect(l).toEqual({ rows: 1, cols: 3, positions: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] });
  });

  it('手机竖屏 2 列 7 人：周长容纳，位置不重复且在界内', () => {
    const l = ringLayout(7, 2);
    expect(l.cols).toBe(2);
    expect(l.rows).toBeGreaterThanOrEqual(4); // 周长 2*2+2*(rows-2) ≥ 7
    expect(l.positions).toHaveLength(7);
    const keys = new Set(l.positions.map((p) => `${p.row},${p.col}`));
    expect(keys.size).toBe(7); // 无重复
    for (const p of l.positions) {
      expect(p.row).toBeGreaterThanOrEqual(0);
      expect(p.row).toBeLessThan(l.rows);
      expect(p.col).toBeGreaterThanOrEqual(0);
      expect(p.col).toBeLessThan(l.cols);
    }
  });

  it('顺时针语义：前两个位置是上边左→右，末尾从左列收尾', () => {
    // 10 人 2 列：上边 (0,0)(0,1) → 右列 → 下边 → 左列
    const l = ringLayout(10, 2);
    expect(l.positions[0]).toEqual({ row: 0, col: 0 });
    expect(l.positions[1]).toEqual({ row: 0, col: 1 });
    expect(l.positions[2]).toEqual({ row: 1, col: 1 });
    expect(l.positions.at(-1)).toEqual({ row: 1, col: 0 });
  });

  it('余数落位：6 人 4 列 → 上边 4 + 下边从右起 2', () => {
    const l = ringLayout(6, 4);
    expect(l.rows).toBe(2);
    expect(l.positions.slice(0, 4)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ]);
    // 环形语义：下边从右往左填（(1,3) 与上边右下角相邻）
    expect(l.positions[4]).toEqual({ row: 1, col: 3 });
    expect(l.positions[5]).toEqual({ row: 1, col: 2 });
  });

  it('列数钳制：cols 超过人数按人数收敛', () => {
    expect(ringLayout(2, 6).cols).toBe(2);
  });

  it('空座位圈：空数组', () => {
    expect(ringLayout(0, 4)).toEqual({ rows: 0, cols: 0, positions: [] });
  });
});
