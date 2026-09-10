/**
 * 角色剪影（ADR-018）：单色 SVG 作 mask + 按着色规则上色的小组件。
 * 取不到图标（库中无此角色、无队伍）时渲染 `null`，调用方照常显示文字即可。
 */
import type { Alignment } from '../types/game';
import type { Team } from '../types/script';
import { tokenIconStyle } from './tokenSkin';

interface RoleIconProps {
  roleId: string | undefined;
  /** 实际阵营，优先于队伍色 */
  alignment?: Alignment | null;
  team?: Team;
  /** CSS 尺寸，默认 1em */
  size?: string;
  /** 有值时作为图片暴露给辅助技术（默认纯装饰） */
  title?: string;
  className?: string;
}

export function RoleIcon({ roleId, alignment, team, size = '1em', title, className }: RoleIconProps) {
  const style = tokenIconStyle(roleId, alignment, team);
  if (!style) return null;
  return (
    <span
      className={className ? `role-icon ${className}` : 'role-icon'}
      style={{ ...style, width: size, height: size }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      title={title}
    />
  );
}
