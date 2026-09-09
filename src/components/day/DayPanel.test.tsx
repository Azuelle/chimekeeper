import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import 'fake-indexeddb/auto';
import '../../i18n';
import { DayPanel } from './DayPanel';
import { useGameStore } from '../../stores/game';
import { useEventStore } from '../../stores/events';
import { parseScript } from '../../lib/scriptParser';
import { clearAll } from '../../persistence/repo';

const fixture = readFileSync(
  join(__dirname, '../../../fixtures/official-tool-tb-sample.json'),
  'utf-8',
);

function setupDayGame(playerCount = 5) {
  const result = parseScript(fixture);
  if (!result.ok) throw new Error(result.error.code);
  const script = result.script;
  useGameStore.getState().createGame(script, playerCount);
  const roles = script.roles.slice(0, playerCount).map((r, i) => ({
    seatNumber: i + 1,
    roleId: r.id,
  }));
  useGameStore.getState().assignRoleDraw(
    roles,
    { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
    [],
  );
  useGameStore.getState().enterFirstNight();
  useGameStore.getState().finishNight();
}

beforeEach(async () => {
  await clearAll();
  useGameStore.setState({ game: null, hydrated: true });
  useEventStore.getState().clear();
});

describe('DayPanel（白天面板）', () => {
  it('渲染白天标题与存活统计', () => {
    setupDayGame();
    render(<DayPanel />);
    expect(screen.getByRole('heading', { name: /第 1 个白天/ })).toBeTruthy();
    expect(screen.getByText(/存活 5 人/)).toBeTruthy();
    expect(screen.getByText(/过半需要 3 票/)).toBeTruthy();
  });

  it('登记提名', async () => {
    const user = userEvent.setup();
    setupDayGame();
    render(<DayPanel />);

    await user.click(screen.getByRole('button', { name: '提名' }));
    await user.selectOptions(screen.getByLabelText('提名者'), '1');
    await user.selectOptions(screen.getByLabelText('被提名者'), '2');
    await user.click(screen.getAllByRole('button', { name: '提名' })[1]!);

    const events = useEventStore.getState().events;
    expect(events.some((e) => e.type === 'nomination')).toBe(true);
  });

  it('登记投票结果（含得票数）', async () => {
    const user = userEvent.setup();
    setupDayGame();
    render(<DayPanel />);

    await user.click(screen.getByRole('button', { name: '提名' }));
    await user.selectOptions(screen.getByLabelText('被提名者'), '3');
    await user.type(screen.getByPlaceholderText('得票数（可选）'), '4');
    await user.click(screen.getByRole('button', { name: '投票' }));

    const ev = useEventStore.getState().events.find((e) => e.type === 'vote');
    expect(ev).toBeTruthy();
    expect(ev?.payload.votesFor).toBe(4);
  });

  it('处决并死亡：生成 execution + death 两个事件', async () => {
    const user = userEvent.setup();
    setupDayGame();
    render(<DayPanel />);

    await user.click(screen.getByRole('button', { name: '提名' }));
    await user.selectOptions(screen.getByLabelText('被提名者'), '2');
    await user.click(screen.getByRole('button', { name: '处决并死亡' }));

    const events = useEventStore.getState().events;
    expect(events.filter((e) => e.type === 'execution').length).toBe(1);
    expect(events.filter((e) => e.type === 'death').length).toBe(1);
    expect(useGameStore.getState().game?.seats.find((s) => s.seatNumber === 2)?.alive).toBe(false);
  });

  it('处决未死亡：只生成 execution 事件且存活', async () => {
    const user = userEvent.setup();
    setupDayGame();
    render(<DayPanel />);

    await user.click(screen.getByRole('button', { name: '提名' }));
    await user.selectOptions(screen.getByLabelText('被提名者'), '3');
    await user.click(screen.getByRole('button', { name: '处决' }));

    const events = useEventStore.getState().events;
    expect(events.filter((e) => e.type === 'execution').length).toBe(1);
    expect(events.filter((e) => e.type === 'death').length).toBe(0);
    expect(useGameStore.getState().game?.seats.find((s) => s.seatNumber === 3)?.alive).toBe(true);
  });

  it('登记死亡与复活', async () => {
    const user = userEvent.setup();
    setupDayGame();
    render(<DayPanel />);

    await user.click(screen.getByRole('button', { name: '登记死亡' }));
    await user.selectOptions(screen.getByLabelText('目标座位'), '4');
    await user.selectOptions(screen.getByLabelText('原因'), 'night');
    await user.click(screen.getAllByRole('button', { name: '登记死亡' })[1]!);

    expect(useGameStore.getState().game?.seats.find((s) => s.seatNumber === 4)?.alive).toBe(false);

    await user.click(screen.getByRole('button', { name: '登记复活' }));
    await user.selectOptions(screen.getByLabelText('目标座位'), '4');
    await user.click(screen.getAllByRole('button', { name: '登记复活' })[1]!);

    expect(useGameStore.getState().game?.seats.find((s) => s.seatNumber === 4)?.alive).toBe(true);
  });

  it('添加自由备注', async () => {
    const user = userEvent.setup();
    setupDayGame();
    render(<DayPanel />);

    await user.click(screen.getByRole('button', { name: '自由备注' }));
    await user.type(screen.getByPlaceholderText('备注内容…'), '茶艺师保护了 1 号');
    await user.click(screen.getAllByRole('button', { name: '自由备注' })[1]!);

    const ev = useEventStore.getState().events.find((e) => e.type === 'note');
    expect(ev?.payload.text).toBe('茶艺师保护了 1 号');
  });

  it('登记结局后进入 ended 阶段并显示复盘导出', async () => {
    const user = userEvent.setup();
    setupDayGame();
    render(<DayPanel />);

    await user.click(screen.getByRole('button', { name: '登记结局' }));
    await user.selectOptions(screen.getByLabelText(/结局/), 'evil');
    await user.click(screen.getAllByRole('button', { name: '登记结局' })[1]!);

    expect(useGameStore.getState().game?.phase).toBe('ended');
    expect(screen.getByRole('button', { name: '复制 Markdown' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '下载 .md' })).toBeTruthy();
  });

  it('入夜需要确认并切换到 night 阶段', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    setupDayGame();
    render(<DayPanel />);

    await user.click(screen.getByRole('button', { name: '入夜' }));
    expect(useGameStore.getState().game?.phase).toBe('night');
  });

  it('返回上一阶段回到首夜', async () => {
    const user = userEvent.setup();
    setupDayGame();
    render(<DayPanel />);

    await user.click(screen.getByRole('button', { name: '返回上一阶段' }));
    expect(useGameStore.getState().game?.phase).toBe('firstNight');
  });

  it('空表单提交不会生成事件', async () => {
    const user = userEvent.setup();
    setupDayGame();
    const before = useEventStore.getState().events.length;
    render(<DayPanel />);

    await user.click(screen.getByRole('button', { name: '提名' }));
    await user.click(screen.getAllByRole('button', { name: '提名' })[1]!);
    await user.click(screen.getByRole('button', { name: '登记死亡' }));
    await user.click(screen.getAllByRole('button', { name: '登记死亡' })[1]!);
    await user.click(screen.getByRole('button', { name: '自由备注' }));
    await user.click(screen.getAllByRole('button', { name: '自由备注' })[1]!);

    expect(useEventStore.getState().events.length).toBe(before);
  });

  it('切换投票权（F-05d）：选择座位后翻转 hasVoteToken', async () => {
    const user = userEvent.setup();
    setupDayGame();
    const before = useGameStore.getState().game!.seats.find((s) => s.seatNumber === 1)!.hasVoteToken;
    render(<DayPanel />);

    await user.click(screen.getByRole('button', { name: '切换投票权' }));
    await user.selectOptions(screen.getByLabelText('目标座位'), '1');
    await user.click(screen.getAllByRole('button', { name: '切换投票权' })[1]!);

    const after = useGameStore.getState().game!.seats.find((s) => s.seatNumber === 1)!.hasVoteToken;
    expect(after).toBe(!before);
  });
});
