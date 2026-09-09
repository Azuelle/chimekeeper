import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import '../../i18n';
import { Home } from './Home';
import { useGameStore } from '../../stores/game';
import { useEventStore } from '../../stores/events';
import { useScriptStore } from '../../stores/script';
import { saveGame, clearAll } from '../../persistence/repo';
import type { Game } from '../../types/game';

function makeGame(id: string, name: string, phase: Game['phase'], round: number): Game {
  return {
    id,
    scriptSnapshot: { name, roles: [] },
    seats: [],
    seatHighWater: 0,
    retiredSeatNumbers: [],
    reusePool: [],
    demonBluffs: [],
    phase,
    round,
    createdAt: 1_000_000,
    updatedAt: 1_000_000,
  };
}

beforeEach(async () => {
  await clearAll();
  useScriptStore.getState().clear();
  useGameStore.setState({ game: null, hydrated: true });
  useEventStore.getState().clear();
});

describe('Home（首页）', () => {
  it('空历史时显示新建对局与空提示', async () => {
    const onNewGame = vi.fn();
    render(<Home onNewGame={onNewGame} />);

    expect(screen.getByRole('button', { name: '新建对局' })).toBeTruthy();
    await waitFor(() => expect(screen.getByText('暂无历史对局')).toBeTruthy());
  });

  it('点击新建对局触发回调', async () => {
    const user = userEvent.setup();
    const onNewGame = vi.fn();
    render(<Home onNewGame={onNewGame} />);

    await user.click(screen.getByRole('button', { name: '新建对局' }));
    expect(onNewGame).toHaveBeenCalled();
  });

  it('列出历史对局并可继续', async () => {
    const user = userEvent.setup();
    await saveGame(makeGame('g1', '暗流涌动', 'setup', 0));
    await saveGame(makeGame('g2', '黯月初升', 'day', 2));

    render(<Home onNewGame={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('黯月初升')).toBeTruthy());
    expect(screen.getByText('暗流涌动')).toBeTruthy();

    await user.click(screen.getAllByRole('button', { name: '继续' })[0]!);
    await waitFor(() => expect(useGameStore.getState().game?.id).toBe('g2'));
  });

  it('删除历史对局需要确认', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await saveGame(makeGame('g1', '暗流涌动', 'setup', 0));

    render(<Home onNewGame={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('暗流涌动')).toBeTruthy());

    await user.click(screen.getByRole('button', { name: '删除' }));
    await waitFor(() => expect(screen.queryByText('暗流涌动')).toBeNull());
  });

  it('显示最近对局的继续按钮', async () => {
    await saveGame(makeGame('g1', '暗流涌动', 'night', 1));
    render(<Home onNewGame={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '继续最近对局' })).toBeTruthy(),
    );
  });

  it('已结束对局显示获胜阵营', async () => {
    const game = makeGame('g1', '暗流涌动', 'ended', 3);
    game.outcome = { winningTeam: 'good', reason: '测试' };
    await saveGame(game);
    render(<Home onNewGame={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/善良阵营 获胜/)).toBeTruthy());
  });
});
