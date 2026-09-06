/**
 * 座位环布局（ADR-005 修订）：座位沿"圆桌感"的环顺时针排布，编号连续相邻。
 *
 * 几何模型（列数由调用方按容器宽算好传入）：
 * - 顶行**铺满列宽**（座位 1 在左上角 col 0，向右到 col C-1，无右上空格）；
 * - 左/右两条竖排 rail 等长 L，右 rail 从顶行右端正下方起，左 rail 自下而上收在座位 1 之下；
 * - 底行右对齐、阅读方向自右向左（整行 C，或收窄一格 C-1，省一行），四角只允许左下空。
 * - 列数 = 2 时不搞圆角（两列太窄，省空间优先）：偶数 = 整行闭环，奇数 = 末尾单座居左。
 *
 * 纯几何纯函数；返回每个座位（按 displayOrder 排序后的第 i 个）的网格坐标。
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

export function ringLayout(count: number, cols: number): RingLayout {
  if (count <= 0) return { rows: 0, cols: 0, positions: [] };
  const C = Math.max(1, Math.min(cols, count));

  // 人数放得下时单行即可，无需成环
  if (count <= C) {
    return {
      rows: 1,
      cols: C,
      positions: Array.from({ length: count }, (_, i) => ({ row: 0, col: i })),
    };
  }

  // 列数不足 2 时无法成环：退化为单列竖排（避免 rail/底行撞在同一格产生重复坐标）
  if (C < 2) {
    return {
      rows: count,
      cols: 1,
      positions: Array.from({ length: count }, (_, i) => ({ row: i, col: 0 })),
    };
  }

  if (C === 2) return twoColumnRing(count);
  return ovalRing(count, C);
}

/**
 * 两列闭环（窄列不做圆角）：右侧列自上而下 2..⌊n/2⌋+1，
 * 左侧列 1、n、n-1、… 收到底；偶数时末行两格相连，奇数时末位单座居左。
 */
function twoColumnRing(n: number): RingLayout {
  const rows = Math.ceil(n / 2);
  const rightCount = Math.floor(n / 2); // 座位 2..rightCount+1 在 col 1
  const positions: GridPos[] = new Array(n);
  for (let s = 0; s < n; s++) {
    const num = s + 1;
    if (num === 1) {
      positions[s] = { row: 0, col: 0 };
    } else if (num <= rightCount + 1) {
      positions[s] = { row: num - 2, col: 1 };
    } else {
      // 左侧收尾：从底行向左上回到座位 1 上方，再与座位 1 相接
      positions[s] = { row: n - num + 1, col: 0 };
    }
  }
  return { rows, cols: 2, positions };
}

/** 椭圆感环（v2 省行版）：顶行铺满 C 个、右 rail 从顶行右端正下方开始，
 *  底行整行或收窄一格，左上/左下角只允许空（顶行无空格，右上不再切角）。 */
function ovalRing(n: number, C: number): RingLayout {
  // 顶行满 C；剩余座位按左右等长 rail + 底行分配：
  // L 取尽量小使底行不超过列宽（底行 = C 或 C-1），行数 = L+2
  const rest = n - C;
  let L = rest > C ? Math.ceil((rest - C) / 2) : 0;
  let B = rest - 2 * L; // rail 太长导致底行<1 时收一档
  while (L > 0 && B < 1) {
    L--;
    B = rest - 2 * L;
  }

  const rows = L + 2; // 顶行 0、左右 rail 行 1..L、底行 L+1
  const positions: GridPos[] = new Array(n);

  // 直接按序号 1..n 填充（位置数组索引即阅读顺序）
  let idx = 0;
  const put = (row: number, col: number) => {
    positions[idx++] = { row, col };
  };

  // 顶行铺满：1..C 自左上角向右（无右上空格）
  for (let c = 0; c < C; c++) put(0, c);
  // 右 rail：col C-1，行 1..L
  for (let r = 1; r <= L; r++) put(r, C - 1);
  // 底行：B 个，右对齐自右向左（右 rail 正下方起，左端连回左 rail）
  for (let b = 0; b < B; b++) put(L + 1, C - 1 - b);
  // 左 rail：col 0，行 L..1 自下而上（与座位 1 相接）
  for (let k = 0; k < L; k++) put(L - k, 0);

  return { rows, cols: C, positions };
}
