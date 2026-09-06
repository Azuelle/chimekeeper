/**
 * 矩形环布局（ADR-005）：座位沿矩形边框顺时针排列。
 * 纯几何函数——输入人数与列数，输出每个环位（按 displayOrder 排序后的
 * 第 i 个座位）的网格坐标。行数自动计算，余数允许上/下边不满。
 */

export interface GridPos {
  row: number;
  col: number;
}

export interface RingLayout {
  rows: number;
  cols: number;
  /** 第 i 项 = displayOrder 排序后第 i 个座位的网格位置 */
  positions: GridPos[];
}

/**
 * @param count 座位数
 * @param cols 期望列数（会被钳制到 [1, count]）
 */
export function ringLayout(count: number, cols: number): RingLayout {
  if (count <= 0) return { rows: 0, cols: 0, positions: [] };
  const c = Math.max(1, Math.min(cols, count));

  // 单行：人数不超过列数时无需成环
  if (count <= c) {
    return {
      rows: 1,
      cols: c,
      positions: Array.from({ length: count }, (_, i) => ({ row: 0, col: i })),
    };
  }

  // 环形周长 = 2c + 2(r-2) ≥ count → r ≥ (count - 2c + 4) / 2
  const rows = Math.max(2, Math.ceil((count - 2 * c + 4) / 2));

  const positions: GridPos[] = [];
  const push = (row: number, col: number) => {
    if (positions.length < count) positions.push({ row, col });
  };

  // 顺时针走环：上边（左→右）→ 右列（下）→ 下边（右→左）→ 左列（上）
  for (let col = 0; col < c; col++) push(0, col);
  for (let row = 1; row <= rows - 2; row++) push(row, c - 1);
  for (let col = c - 1; col >= 0; col--) push(rows - 1, col);
  for (let row = rows - 2; row >= 1; row--) push(row, 0);

  return { rows, cols: c, positions };
}
