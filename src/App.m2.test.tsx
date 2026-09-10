/**
 * M2 验收链路（App 级）：导入 → 排座位 → 抽袋 → 入夜 → 夜单 → 白天，
 * 以及杀后台后重开 App 的恢复路由（F-07a，ADR-017 #4）。
 * 使用 fake-indexeddb，写通持久化真实生效。
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import './i18n';
import { App } from './App';
import { useScriptStore } from './stores/script';
import { useGameStore } from './stores/game';
import { useEventStore } from './stores/events';
import { clearAll } from './persistence/repo';

beforeEach(async () => {
  vi.restoreAllMocks();
  await clearAll();
  useScriptStore.getState().clear();
  useGameStore.getState().reset();
  useGameStore.setState({ game: null, hydrated: false });
  useEventStore.getState().clear();
});

describe('App M2 链路（抽袋 → 夜单 → 白天 → 恢复）', () => {
  it('完整首夜流程 + 杀后台恢复到正确界面', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    // 开桌：首页 → 内置剧本 → 排座位 → 7 人生成
    await screen.findByRole('button', { name: '新建对局' });
    await user.click(screen.getByRole('button', { name: '新建对局' }));
    await screen.findByRole('button', { name: '暗流涌动' });
    await user.click(screen.getByRole('button', { name: '暗流涌动' }));
    await user.click(screen.getByRole('button', { name: '排座位' }));
    await user.click(screen.getByRole('button', { name: '生成座位' }));

    // 抽袋 → 随机分配 → 入夜
    await user.click(screen.getByRole('button', { name: '角色分配' }));
    await user.click(screen.getByRole('button', { name: '随机分配' }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: '入夜（首夜）' }));

    // 夜单：勾黎明收尾首夜 → 白天占位
    await screen.findByRole('heading', { level: 2, name: /首夜/ });
    // 魔典/座位表在夜/白天阶段始终可见
    expect(screen.getByRole('button', { name: '座位编号 1' })).toBeTruthy();
    // ADR-018：已分配角色的座位 token 渲染剪影 + 弧形角色名
    expect(document.querySelectorAll('.token-ring__icon').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.token-ring__arc textPath').length).toBeGreaterThan(0);
    await user.click(screen.getByLabelText('黎明'));
    expect(screen.getByRole('heading', { level: 2, name: '第 1 个白天' })).toBeTruthy();
    expect(useGameStore.getState().game?.round).toBe(1);

    // 白天入夜 → 第 2 夜
    await user.click(screen.getByRole('button', { name: '入夜' }));
    expect(screen.getByRole('heading', { level: 2, name: /第 2 夜/ })).toBeTruthy();

    // 杀后台：卸载 + 清内存（库保留），重开 App 恢复到第 2 夜
    unmount();
    useScriptStore.getState().clear();
    useGameStore.setState({ game: null, hydrated: false });
    useEventStore.getState().clear();

    render(<App />);
    await screen.findByRole('heading', { level: 2, name: /第 2 夜/ });
    expect(useGameStore.getState().game?.round).toBe(1);
    expect(useGameStore.getState().game?.phase).toBe('night');
    // 剧本状态从快照重建：夜单角色步骤照常渲染
    expect(screen.getByText('黄昏')).toBeTruthy();
    expect(useEventStore.getState().events.length).toBeGreaterThan(0);
  });

  it('恢复时回到抽袋页：setup 阶段已抽袋（composition 已写）', async () => {
    // 直接经 store 造一个抽过袋的 setup 局并落库
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
    useGameStore.setState({ game: null, hydrated: false });

    render(<App />);
    await screen.findByRole('heading', { name: '角色分配（盲抽袋）' });
    expect(screen.getByRole('button', { name: '重新抽取' })).toBeTruthy();
  });
});
