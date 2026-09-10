import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import 'fake-indexeddb/auto';
import '../../i18n';
import { RecapExport } from './RecapExport';
import { useScriptStore } from '../../stores/script';
import { useGameStore } from '../../stores/game';
import { useEventStore } from '../../stores/events';
import { clearAll } from '../../persistence/repo';

const fixture = readFileSync(
  join(__dirname, '../../../fixtures/official-tool-tb-sample.json'),
  'utf-8',
);

function setupEndedGame() {
  useScriptStore.getState().importFromText(fixture);
  const script = useScriptStore.getState().script!;
  useGameStore.getState().createGame(script, 5);
  const roles = script.roles.slice(0, 5).map((r, i) => ({ seatNumber: i + 1, roleId: r.id }));
  useGameStore.getState().assignRoleDraw(
    roles,
    { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
    [],
  );
  useGameStore.getState().enterFirstNight();
  useGameStore.getState().finishNight();
  useGameStore.getState().endGame('good', '测试结局');
}

beforeEach(async () => {
  await clearAll();
  useScriptStore.getState().clear();
  useGameStore.setState({ game: null, hydrated: true });
  useEventStore.getState().clear();
  setupEndedGame();
});

describe('RecapExport（战报导出）', () => {
  it('渲染复制与下载按钮', () => {
    render(<RecapExport />);
    expect(screen.getByRole('button', { name: '复制 Markdown' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '下载 .md' })).toBeTruthy();
  });

  it('点击复制将 Markdown 写入剪贴板', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<RecapExport />);
    await user.click(screen.getByRole('button', { name: '复制 Markdown' }));

    expect(writeText).toHaveBeenCalled();
    expect(writeText.mock.calls[0]![0]).toContain('复盘');
    expect(screen.getByRole('button', { name: '已复制' })).toBeTruthy();
  });

  it('navigator.clipboard 不可用时降级到 execCommand 复制', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });

    render(<RecapExport />);
    await user.click(screen.getByRole('button', { name: '复制 Markdown' }));

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(screen.getByRole('button', { name: '已复制' })).toBeTruthy();
  });

  it('复制失败（clipboard 与 execCommand 都失败）时不抛错', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    Object.defineProperty(document, 'execCommand', { value: vi.fn().mockReturnValue(false), configurable: true });

    render(<RecapExport />);
    await user.click(screen.getByRole('button', { name: '复制 Markdown' }));
    expect(screen.queryByRole('button', { name: '已复制' })).toBeNull();
  });

  it('点击下载触发锚点下载', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL, revokeObjectURL },
      configurable: true,
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<RecapExport />);
    await user.click(screen.getByRole('button', { name: '下载 .md' }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
