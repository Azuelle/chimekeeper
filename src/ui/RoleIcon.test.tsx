import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoleIcon } from './RoleIcon';

describe('RoleIcon（ADR-018）', () => {
  it('已知角色：渲染 mask 剪影 + 赋色', () => {
    const { container } = render(<RoleIcon roleId="imp" alignment="good" team="demon" size="1.4rem" />);
    const el = container.querySelector('.role-icon') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.style.width).toBe('1.4rem');
    expect(el.style.maskImage || el.style.webkitMaskImage).toContain('imp.svg');
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('取不到图标：渲染 null', () => {
    const { container } = render(<RoleIcon roleId="homebrew-role" />);
    expect(container.querySelector('.role-icon')).toBeNull();
  });

  it('有 title 时作为 img 暴露', () => {
    const { container } = render(<RoleIcon roleId="imp" team="demon" title="小恶魔" />);
    const el = container.querySelector('.role-icon') as HTMLElement;
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('小恶魔');
  });
});
