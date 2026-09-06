/**
 * Token 皮肤（ADR-005 素材红线）：座位 token 外观的唯一入口。
 *
 * 当前是纯 CSS 自绘占位——不复制/外链集石或官方素材；未来取得 TPI 授权后
 * 在这个模块换成官方美术（icon URL/纹样）并保持同一数据接口，卡片组件零改动。
 */
export type Alignment = 'good' | 'evil';

/** 阵营圆环主色：good 蓝 / evil 红（说书人可见性优先，符合官方 token 阵营色直觉） */
export const TEAM_RING_COLOR: Record<Alignment, string> = {
  good: '#4d82e8',
  evil: '#d4576b',
};

/** 同色的柔光，让圆环在暗底上可一眼辨色 */
export const TEAM_GLOW: Record<Alignment, string> = {
  good: 'rgba(77, 130, 232, 0.35)',
  evil: 'rgba(212, 87, 107, 0.35)',
};

export interface RingSkin {
  borderColor?: string;
  boxShadow?: string;
}

/**
 * 按座位实际阵营取圆环外观；未分配（M1 全程 / M2 抽袋前）返回空对象，
 * 由 CSS 默认灰环表达"占位"。
 */
export function ringSkinFor(alignment?: Alignment | null): RingSkin {
  if (!alignment) return {};
  const c = TEAM_RING_COLOR[alignment];
  return { borderColor: c, boxShadow: `0 0 0 2px ${TEAM_GLOW[alignment]}` };
}
