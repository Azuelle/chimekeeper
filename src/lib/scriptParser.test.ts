import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseScript } from './scriptParser';

const fixture = (name: string) => readFileSync(join(__dirname, '../../fixtures', name), 'utf-8');

describe('parseScript', () => {
  it('解析 bra1n 标准格式样本', () => {
    const result = parseScript(fixture('bra1n-tb-sample.json'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.script.name).toBe('暗流涌动');
    expect(result.script.roles).toHaveLength(8);
    expect(result.script.roles[0]?.team).toBe('townsfolk');
  });

  it('宽松模式：自定义字段透传并记 warning，导入成功', () => {
    const result = parseScript(fixture('custom-cn-fields-sample.json'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // logo / almanac / bootlegger 三个自定义 meta 字段各有 info warning
    expect(result.script.warnings.length).toBeGreaterThanOrEqual(3);
    expect(result.script.warnings.every((w) => w.level === 'info')).toBe(true);
    // jinx 被正确识别
    expect(result.script.jinxes).toHaveLength(1);
    expect(result.script.jinxes[0]?.id).toBe('monk');
  });

  it('非法 JSON 文本返回可读错误', () => {
    const result = parseScript('这不是json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('scriptImport.error.invalidJson');
  });

  it('未知阵营返回指明角色的错误', () => {
    const bad = JSON.stringify([{ id: 'x', name: '测试角色', team: 'werewolf' }]);
    const result = parseScript(bad);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('scriptImport.error.unknownTeam');
    expect(result.error.params?.['role']).toBe('测试角色');
  });

  it('空角色列表报错', () => {
    const result = parseScript(JSON.stringify([{ id: '_meta', name: '空' }]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('scriptImport.error.noRoles');
  });
});
