import { describe, expect, it } from 'vitest';
import {
  NEUTRAL_TINT,
  TEAM_RING_COLOR,
  TEAM_TINT_COLOR,
  resolveTint,
  tokenIconStyle,
} from './tokenSkin';
import { hasRoleIcon, roleIconUrl } from './roleIcons';

describe('resolveTint（ADR-018：阵营优先，回落队伍）', () => {
  it('实际阵营覆盖队伍色：善良 Imp = 蓝', () => {
    expect(resolveTint('good', 'demon')).toBe(TEAM_RING_COLOR.good);
    expect(resolveTint('evil', 'townsfolk')).toBe(TEAM_RING_COLOR.evil);
  });

  it('无实际阵营时回落队伍色', () => {
    expect(resolveTint(undefined, 'demon')).toBe(TEAM_TINT_COLOR.demon);
    expect(resolveTint(null, 'traveler')).toBe(TEAM_TINT_COLOR.traveler);
  });

  it('都无 → 中性灰', () => {
    expect(resolveTint(undefined, undefined)).toBe(NEUTRAL_TINT);
  });
});

describe('roleIconUrl', () => {
  it('规范化 id 命中专属剪影（含下划线写法）', () => {
    expect(roleIconUrl('imp')).toContain('/imp.svg');
    expect(roleIconUrl('fortune_teller')).toContain('/fortuneteller.svg');
    expect(hasRoleIcon('fortune-teller')).toBe(true);
  });

  it('未知角色回落队伍通用图标', () => {
    expect(roleIconUrl('homebrew-role', 'demon')).toContain('/demon.svg');
  });

  it('未知角色且无队伍 → undefined（组件回落文本）', () => {
    expect(roleIconUrl('homebrew-role')).toBeUndefined();
    expect(roleIconUrl(undefined, undefined)).toBeUndefined();
  });
});

describe('tokenIconStyle（mask + 赋色）', () => {
  it('善良 Imp：backgroundColor = 阵营蓝，mask 指向剪影', () => {
    const style = tokenIconStyle('imp', 'good', 'demon');
    expect(style?.backgroundColor).toBe(TEAM_RING_COLOR.good);
    expect(String(style?.maskImage)).toContain('imp.svg');
    expect(String(style?.WebkitMaskImage)).toContain('imp.svg');
  });

  it('未分配角色但有队伍：按队伍色且用兜底剪影', () => {
    const style = tokenIconStyle(undefined, undefined, 'minion');
    expect(style?.backgroundColor).toBe(TEAM_TINT_COLOR.minion);
    expect(String(style?.maskImage)).toContain('minion.svg');
  });

  it('无图标可渲染时返回 null', () => {
    expect(tokenIconStyle(undefined, undefined, undefined)).toBeNull();
  });
});
