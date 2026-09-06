import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useScriptStore } from './script';

const fixture = (name: string) => readFileSync(join(__dirname, '../../fixtures', name), 'utf-8');

const store = () => useScriptStore.getState();

beforeEach(() => {
  useScriptStore.getState().clear();
});

describe('scriptStore（F-01）', () => {
  it('fixtures 全部样本可导入（F-01d 强制）', () => {
    for (const name of [
      'bra1n-tb-sample.json',
      'official-tool-tb-sample.json',
      'botcscripts-outed-evil.json',
      'custom-cn-fields-sample.json',
    ]) {
      expect(store().importFromText(fixture(name)), name).toBe(true);
      expect(store().script, name).not.toBeNull();
      useScriptStore.getState().clear();
    }
  });

  it('非法文本：报 i18n 错误码，script 保持 null', () => {
    expect(store().importFromText('这不是json')).toBe(false);
    expect(store().script).toBeNull();
    expect(store().error?.code).toBe('scriptImport.error.invalidJson');
  });

  it('导入成功清空历史错误', () => {
    store().importFromText('bad');
    expect(store().error).not.toBeNull();
    store().importFromText(fixture('bra1n-tb-sample.json'));
    expect(store().error).toBeNull();
    expect(store().script?.name).toBe('暗流涌动');
  });

  it('文件导入：走同一条解析链路', async () => {
    const file = new File([fixture('official-tool-tb-sample.json')], 'script.json', {
      type: 'application/json',
    });
    expect(await store().importFromFile(file)).toBe(true);
    expect(store().script?.roles.length).toBeGreaterThan(0);
  });

  it('内置剧本：三版均可选（ADR-015）', () => {
    for (const id of ['tb', 'bmr', 'snv'] as const) {
      expect(store().selectBuiltin(id), id).toBe(true);
      expect(store().script?.roles.length, id).toBeGreaterThan(10);
      useScriptStore.getState().clear();
    }
  });
});

describe('scriptStore.importFromUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('成功拉取并解析', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, text: async () => fixture('bra1n-tb-sample.json') })),
    );
    expect(await store().importFromUrl('https://example.com/script.json')).toBe(true);
    expect(store().script?.name).toBe('暗流涌动');
  });

  it('网络失败 → fetchFailed，引导粘贴/上传兜底', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('cors'))));
    expect(await store().importFromUrl('https://example.com/script.json')).toBe(false);
    expect(store().error?.code).toBe('scriptImport.error.fetchFailed');
  });

  it('非 2xx → fetchFailed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, text: async () => '' })));
    expect(await store().importFromUrl('https://example.com/404.json')).toBe(false);
    expect(store().error?.code).toBe('scriptImport.error.fetchFailed');
  });

  it('非法 / 非 http(s) URL → invalidUrl', async () => {
    expect(await store().importFromUrl('不是地址')).toBe(false);
    expect(store().error?.code).toBe('scriptImport.error.invalidUrl');
    expect(await store().importFromUrl('file:///etc/passwd')).toBe(false);
    expect(store().error?.code).toBe('scriptImport.error.invalidUrl');
  });
});
