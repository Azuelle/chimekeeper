import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../../i18n';
import { ScriptImport } from './ScriptImport';
import { useScriptStore } from '../../stores/script';

const fixture = (name: string) => readFileSync(join(__dirname, '../../../fixtures', name), 'utf-8');

/** 两个「导入」按钮：[0] = 粘贴区，[1] = URL 区（按 DOM 顺序） */
const importButtons = () => screen.getAllByRole('button', { name: '导入' });

beforeEach(() => {
  useScriptStore.getState().clear();
});

describe('ScriptImport（F-01）', () => {
  it('粘贴导入成功：store 持有剧本且无错误提示', async () => {
    const user = userEvent.setup();
    render(<ScriptImport />);
    fireEvent.change(screen.getByPlaceholderText('把剧本 JSON 粘贴到这里…'), {
      target: { value: fixture('bra1n-tb-sample.json') },
    });
    await user.click(importButtons()[0]!);
    expect(useScriptStore.getState().script?.name).toBe('暗流涌动');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('粘贴导入失败：展示中文错误', async () => {
    const user = userEvent.setup();
    render(<ScriptImport />);
    fireEvent.change(screen.getByPlaceholderText('把剧本 JSON 粘贴到这里…'), {
      target: { value: '这不是json' },
    });
    await user.click(importButtons()[0]!);
    expect(screen.getByRole('alert').textContent).toContain('无法解析');
  });

  it('文件导入：与粘贴同链路（纯 ID 剧本注水）', async () => {
    const { container } = render(<ScriptImport />);
    const input = container.querySelector<HTMLInputElement>("input[type='file']")!;
    const file = new File([fixture('official-tool-tb-sample.json')], 'script.json', {
      type: 'application/json',
    });
    fireEvent.change(input, { target: { files: [file] } });
    // file.text() 异步，等 store 落定
    await waitFor(() =>
      expect(useScriptStore.getState().script?.roles.length).toBeGreaterThan(0),
    );
  });

  it('内置剧本一键选择', async () => {
    const user = userEvent.setup();
    render(<ScriptImport />);
    await user.click(screen.getByRole('button', { name: '暗流涌动' }));
    expect(useScriptStore.getState().script?.roles.length).toBeGreaterThan(10);
  });

  it('URL 导入成功', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, text: async () => fixture('bra1n-tb-sample.json') })),
    );
    const user = userEvent.setup();
    render(<ScriptImport />);
    fireEvent.change(screen.getByPlaceholderText('https://…（剧本 JSON 直链）'), {
      target: { value: 'https://example.com/s.json' },
    });
    await user.click(importButtons()[1]!);
    expect(useScriptStore.getState().script?.name).toBe('暗流涌动');
  });

  it('URL 拉取失败：引导粘贴/上传', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('cors'))));
    const user = userEvent.setup();
    render(<ScriptImport />);
    fireEvent.change(screen.getByPlaceholderText('https://…（剧本 JSON 直链）'), {
      target: { value: 'https://example.com/s.json' },
    });
    await user.click(importButtons()[1]!);
    expect(screen.getByRole('alert').textContent).toContain('URL 拉取失败');
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
