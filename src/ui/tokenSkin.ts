/**
 * Token 皮肤（ADR-005 / ADR-018 素材红线）：座位 token 外观的唯一入口。
 *
 * 圆环与图标两套着色都收口在这里，组件只消费不写死：
 * - `ringSkinFor`：圆环边框按**实际阵营**着色（good 蓝 / evil 红）；
 * - `tokenIconStyle`：角色剪影用 CSS `mask` 赋色——单色 SVG 作 mask，
 *   `background-color` 决定颜色，因此红色 Imp 剪影可以渲成蓝色。
 *   颜色同样**实际阵营优先、回落角色队伍色**（ADR-018）。
 *
 * 图标仅运行时外链（`ui/roleIcons`，ADR-004 不打包），取不到时组件回落纯文本。
 */
import type { CSSProperties } from 'react';
import type { Alignment } from '../types/game';
import type { Team } from '../types/script';
import { roleIconUrl } from './roleIcons';

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

/** 队伍图标主色（无实际阵营时的回落；对齐官方队伍色：善良蓝 / 邪恶红 / 旅行者紫 / 传奇金 / 传说绿） */
export const TEAM_TINT_COLOR: Record<Team, string> = {
  townsfolk: '#4d82e8',
  outsider: '#63c7e8',
  minion: '#d4576b',
  demon: '#b8394d',
  traveler: '#cc04ff',
  fabled: '#bfa600',
  loric: '#69892b',
};

/** 未分配角色/无队伍：中性灰剪影 */
export const NEUTRAL_TINT = '#8b8498';

/**
 * 解析剪影着色：实际阵营优先（good 蓝 / evil 红），否则回落角色队伍色，都无 → 灰。
 */
export function resolveTint(alignment?: Alignment | null, team?: Team): string {
  if (alignment === 'good') return TEAM_RING_COLOR.good;
  if (alignment === 'evil') return TEAM_RING_COLOR.evil;
  if (team) return TEAM_TINT_COLOR[team];
  return NEUTRAL_TINT;
}

/**
 * 角色剪影的内联样式：SVG 作 mask + 背景色赋色。
 * 无图标（库里没有且无队伍）时返回 `null`，调用方回落纯文本。
 */
export function tokenIconStyle(
  roleId: string | undefined,
  alignment?: Alignment | null,
  team?: Team,
): CSSProperties | null {
  const url = roleIconUrl(roleId, team);
  if (!url) return null;
  const mask = `url("${url}")`;
  return {
    backgroundColor: resolveTint(alignment, team),
    maskImage: mask,
    WebkitMaskImage: mask,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
  };
}

/**
 * 座位 token 角色名的底部弧线路径（ADR-018 #4）：沿下半环、逆时针走向让字正立，
 * 与 `.token-ring__arc` 的 `viewBox="0 0 100 100"` 对应。
 */
export const TOKEN_ARC_PATH = 'M 15.36 30 A 40 40 0 1 0 84.64 30';

/** `TOKEN_ARC_PATH` 的坐标系统（SVG `viewBox`），与路径成对改动 */
export const TOKEN_MARK_VIEWBOX = '0 0 100 100';

/**
 * 弧形角色名（ADR-018 #4）：全大写 + 按字符数动态缩字号，避免长名绕成半圆。
 * 无名返回 `null`，调用方不渲染 `<text>`。
 */
export function tokenLabel(name?: string | null): { text: string; fontSize: number } | null {
  if (!name) return null;
  const text = name.toUpperCase();
  return { text, fontSize: Math.min(15, Math.max(9, 120 / text.length)) };
}

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
