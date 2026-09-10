import { describe, expect, it } from 'vitest';
import {
  NEUTRAL_TINT,
  TEAM_RING_COLOR,
  TEAM_TINT_COLOR,
  TOKEN_ARC_PATH,
  TOKEN_MARK_VIEWBOX,
  resolveTint,
  tokenIconStyle,
  tokenLabel,
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

describe('tokenLabel（ADR-018 #4：全大写 + 动态字号）', () => {
  it('短名全大写、字号封顶 15', () => {
    expect(tokenLabel('Imp')).toEqual({ text: 'IMP', fontSize: 15 });
  });

  it('长名按 120/长度 缩字号，下限 9', () => {
    expect(tokenLabel('Poisoner')!.fontSize).toBeCloseTo(120 / 8);
    expect(tokenLabel('a'.repeat(13))!.fontSize).toBeCloseTo(120 / 13);
    expect(tokenLabel('a'.repeat(20))!.fontSize).toBe(9);
  });

  it('无名（null/undefined/空串）不渲染', () => {
    expect(tokenLabel(null)).toBeNull();
    expect(tokenLabel(undefined)).toBeNull();
    expect(tokenLabel('')).toBeNull();
  });

  it('弧线路径与坐标系统成对存在', () => {
    expect(TOKEN_ARC_PATH.length).toBeGreaterThan(0);
    expect(TOKEN_MARK_VIEWBOX).toBe('0 0 100 100');
  });
});
