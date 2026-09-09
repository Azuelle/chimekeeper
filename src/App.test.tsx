import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import 'fake-indexeddb/auto';
import './i18n';
import { App } from './App';
import { useScriptStore } from './stores/script';
import { useGameStore } from './stores/game';
import { clearAll } from './persistence/repo';

const fixture = (name: string) => readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

beforeEach(async () => {
  await clearAll();
  useScriptStore.getState().clear();
  useGameStore.getState().reset();
  useGameStore.setState({ game: null, hydrated: false });
});

describe('App 主流程（M1 验收链路）', () => {
  it('导入官方工具导出的纯 ID 剧本 → 角色列表 → 排 7 人座位（填昵称）', async () => {
    const user = userEvent.setup();
    render(<App />);
    // 挂载 hydrate（F-07a）完成后先渲染首页，点击新建对局进入导入
    await screen.findByRole('button', { name: '新建对局' });
    await user.click(screen.getByRole('button', { name: '新建对局' }));
    await screen.findByPlaceholderText('把剧本 JSON 粘贴到这里…');

    // 1. 粘贴导入（官方 script tool 纯 ID 格式 → 注水库补全）
    fireEvent.change(screen.getByPlaceholderText('把剧本 JSON 粘贴到这里…'), {
      target: { value: fixture('official-tool-tb-sample.json') },
    });
    await user.click(screen.getAllByRole('button', { name: '导入' })[0]!);

    // 2. 角色列表预览
    expect(screen.getByText(/共 \d+ 个角色/)).toBeTruthy();
    const scriptName = useScriptStore.getState().script?.name || '（未命名剧本）';
    expect(screen.getByRole('heading', { level: 2, name: scriptName })).toBeTruthy();

    // 3. 排座位：默认 7 人生成
    await user.click(screen.getByRole('button', { name: '排座位' }));
    await user.click(screen.getByRole('button', { name: '生成座位' }));
    expect(useGameStore.getState().game?.seats).toHaveLength(7);
    expect(screen.getAllByRole('listitem')).toHaveLength(7);

    // 4. 昵称：点卡片 → 菜单顶部文本框直改
    await user.click(screen.getByRole('button', { name: '座位编号 2' }));
    await user.type(screen.getByLabelText('座位编号 2 昵称（可空）'), '小美');
    expect(useGameStore.getState().game?.seats.find((s) => s.seatNumber === 2)?.playerName).toBe('小美');
  });

  it('换个剧本：清空对局回到导入页', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: '新建对局' });
    await user.click(screen.getByRole('button', { name: '新建对局' }));
    await screen.findByRole('button', { name: '暗流涌动' });
    await user.click(screen.getByRole('button', { name: '暗流涌动' }));
    await user.click(screen.getByRole('button', { name: '排座位' }));
    await user.click(screen.getByRole('button', { name: '生成座位' }));
    expect(useGameStore.getState().game).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '换个剧本' }));
    expect(useScriptStore.getState().script).toBeNull();
    expect(useGameStore.getState().game).toBeNull();
    expect(screen.getByRole('button', { name: '暗流涌动' })).toBeTruthy();
  });

  it('setup 阶段已抽袋：恢复后显示抽袋页，并可在排座位/抽袋间往返', async () => {
    const user = userEvent.setup();
    useScriptStore.getState().selectBuiltin('tb');
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    useGameStore.getState().assignRoleDraw(
      [
        { seatNumber: 1, roleId: 'imp' },
        { seatNumber: 2, roleId: 'poisoner' },
        { seatNumber: 3, roleId: 'washerwoman' },
        { seatNumber: 4, roleId: 'librarian' },
        { seatNumber: 5, roleId: 'investigator' },
        { seatNumber: 6, roleId: 'chef' },
        { seatNumber: 7, roleId: 'empath' },
      ],
      { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
      [],
    );
    useScriptStore.getState().clear();

    render(<App />);
    await screen.findByRole('heading', { name: '角色分配（盲抽袋）' });

    // drawing -> seats (onBack)
    await user.click(screen.getByRole('button', { name: '排座位' }));
    await screen.findByRole('button', { name: '角色分配' });

    // seats -> drawing (onAssign)
    await user.click(screen.getByRole('button', { name: '角色分配' }));
    expect(screen.getByRole('heading', { name: '角色分配（盲抽袋）' })).toBeTruthy();
  });

  it('对局进行中可经顶栏「首页」离开回首页（不删库）', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: '新建对局' });
    await user.click(screen.getByRole('button', { name: '新建对局' }));
    await screen.findByRole('button', { name: '暗流涌动' });
    await user.click(screen.getByRole('button', { name: '暗流涌动' }));
    await user.click(screen.getByRole('button', { name: '排座位' }));
    await user.click(screen.getByRole('button', { name: '生成座位' }));
    expect(useGameStore.getState().game).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '首页' }));
    await screen.findByRole('button', { name: '新建对局' });
    expect(useGameStore.getState().game).toBeNull();
  });
});
