/**
 * 单色小图标集（菜单用，macOS 风细描边，无外部素材）。
 * 全部自绘、`currentColor` 描边——遵守 TPI 素材红线（ADR-005）。
 * 用法：`.seat-menu` 内以字号或显式尺寸控制大小。
 */
import type { ReactNode } from 'react';

export type SeatGlyphName =
  | 'swap'
  | 'ripple'
  | 'remove'
  | 'assignRole'
  | 'changeRole'
  | 'addReminder'
  | 'setAlignment'
  | 'logNight'
  | 'markDead'
  | 'markVote'
  | 'nominate';

const GLYPHS: Record<SeatGlyphName, ReactNode> = {
  // 交换座位：左右对向箭头
  swap: (
    <>
      <path d="M8 3 4 7l4 4M4 7h16" />
      <path d="m16 21 4-4-4-4M20 17H4" />
    </>
  ),
  // 平移座位（涟漪式，队伍整体前移）：双 chevron 前移
  ripple: (
    <>
      <path d="m5 7 5 5-5 5" />
      <path d="m13 7 5 5-5 5" />
    </>
  ),
  // 移除座位：垃圾桶
  remove: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  // 分配角色：人 + 加号
  assignRole: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.7-3.4 3.4-5 6.5-5s5.8 1.6 6.5 5" />
      <path d="M19 9v6M16 12h6" />
    </>
  ),
  // 更换角色：循环箭头
  changeRole: <path d="M21 12a9 9 0 1 1-3.2-6.9M21 3v6h-6" />,
  // 添加提示标记：铃铛
  addReminder: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </>
  ),
  // 设置阵营：准星/靶心
  setAlignment: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  // 记录夜晚行动：月亮
  logNight: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  // 标记死亡：骷髅
  markDead: (
    <>
      <path d="M12 3a8 8 0 0 0-8 8c0 3 1 4 1 5v3h14v-3c0-1 1-2 1-5a8 8 0 0 0-8-8Z" />
      <path d="M9 12a1 1 0 0 1 1 1M15 12a1 1 0 0 0-1 1" />
    </>
  ),
  // 标记投票：打勾圆圈
  markVote: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  // 提名：喇叭
  nominate: (
    <>
      <path d="M4 9h3l6-5v16l-6-5H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z" />
      <path d="M15 9a4 4 0 0 1 0 6" />
    </>
  ),
};

export function SeatGlyph({ name }: { name: SeatGlyphName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPHS[name]}
    </svg>
  );
}
