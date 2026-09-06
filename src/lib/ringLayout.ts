/**
 * 座位环布局（ADR-005 修订）：座位沿"圆桌感"的环顺时针排布，编号连续相邻。
 *
 * 几何模型（列数由调用方按容器宽算好传入）：
 * - 顶行不一定整行（座位 1 固定在左上角 col 0，向右延伸 T 个）；
 * - 左/右两条竖排 rail 等长 L，右 rail 从顶行尾端向下，左 rail 自下而上收在座位 1 之下；
 * - 底行横向收窄/居中放 B 个（阅读方向自右向左），与两 rail 斜接，四个角只允许空角格。
 *   T+B+2L = 人数，T = min(列数, ⌈(T+B)/2⌉)。
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

/** 椭圆感环：rail 等长 L + 顶底 cap；只允许角落空、底部收窄居中 */
function ovalRing(n: number, C: number): RingLayout {
  // 基准 rail 长（锚定样例的"椭圆感"）；随后只修正越界：
  // 底部不能少于 1（太多人时缩短 rail），也不能超过列宽（太少人时加长 rail）
  let L = n - 2 * C - 1;
  if (L < 0) L = 0;

  const capsOf = (lv: number) => {
    const caps = n - 2 * lv;
    const T = Math.min(C, Math.ceil(caps / 2));
    return { T, B: caps - T };
  };
  let { T, B } = capsOf(L);
  // 顶/底 cap 不足会让"顶行末尾→右 rail"拐角断开：cap 至少要能摸到 C-1 宽
  while (L > 0 && (B < 1 || T < C - 1)) {
    L--;
    ({ T, B } = capsOf(L));
  }
  while (B > C) {
    L++;
    ({ T, B } = capsOf(L));
  }

  const rows = L + 2; // 顶行 0、右/左 rail 行 1..L、底行 L+1
  const positions: GridPos[] = new Array(n);

  // 直接按序号 1..n 填充（位置数组索引即阅读顺序）
  let idx = 0;
  const put = (row: number, col: number) => {
    positions[idx++] = { row, col };
  };

  // 顶行：1..T，自左上角向右
  for (let c = 0; c < T; c++) put(0, c);
  // 右 rail：col C-1，行 1..L
  for (let r = 1; r <= L; r++) put(r, C - 1);
  // 底行：B 个，横向居中，阅读方向自右向左
  const sBottom = Math.max(0, Math.min(C - B, Math.round((C - B) / 2)));
  for (let b = 0; b < B; b++) put(L + 1, sBottom + B - 1 - b);
  // 左 rail：col 0，行 L..1 自下而上（与座位 1 相接）
  for (let k = 0; k < L; k++) put(L - k, 0);

  return { rows, cols: C, positions };
}
