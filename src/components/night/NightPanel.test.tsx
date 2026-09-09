import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../../i18n';
import { NightPanel } from './NightPanel';
import { DayPlaceholder } from '../DayPlaceholder';
import { useScriptStore } from '../../stores/script';
import { useGameStore } from '../../stores/game';
import { useEventStore } from '../../stores/events';
import { createEvent } from '../../lib/events';

const fixture = (name: string) => readFileSync(join(__dirname, '../../../fixtures', name), 'utf-8');

/** 固定分配：1=洗衣妇 2=占卜师 3=投毒者 4=小恶魔 5-7=僧侣/管家/图书管理员 */
const ASSIGN: Array<{ seatNumber: number; roleId: string }> = [
  { seatNumber: 1, roleId: 'washerwoman' },
  { seatNumber: 2, roleId: 'fortune_teller' },
  { seatNumber: 3, roleId: 'poisoner' },
  { seatNumber: 4, roleId: 'imp' },
  { seatNumber: 5, roleId: 'monk' },
  { seatNumber: 6, roleId: 'butler' },
  { seatNumber: 7, roleId: 'librarian' },
];

beforeEach(() => {
  vi.restoreAllMocks();
  useScriptStore.getState().clear();
  useGameStore.getState().reset();
  useEventStore.getState().clear();
  useScriptStore.getState().importFromText(fixture('bra1n-tb-sample.json'));
  useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
  useGameStore.getState().assignRoleDraw(ASSIGN, { townsfolk: 4, outsider: 1, minion: 1, demon: 1 }, []);
  useGameStore.getState().enterFirstNight();
});

const game = () => useGameStore.getState().game!;
const events = () => useEventStore.getState().events;

describe('NightPanel（F-04 夜单，ADR-006/017）', () => {
  it('首夜 ≥7 人：黄昏 → 爪牙信息 → 恶魔信息 → 角色步骤 → 黎明，含座位号', () => {
    render(<NightPanel />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('夜晚行动顺序');
    expect(heading.textContent).toContain('首夜');
    expect(screen.getByText('黄昏')).toBeTruthy();
    expect(screen.getByText('爪牙信息')).toBeTruthy();
    expect(screen.getByText('恶魔信息')).toBeTruthy();
    expect(screen.getByText('黎明')).toBeTruthy();
    // 洗衣妇步骤带座位 1，恶魔信息带座位 4（小恶魔）
    expect(screen.getByText('座位 1')).toBeTruthy();
    expect(screen.getAllByText('座位 4').length).toBeGreaterThan(0);
    expect(screen.getByText(/展示其镇民角色标记/)).toBeTruthy(); // 官方提示词
  });

  it('勾选角色步骤：nightProgress 记录 + night_action 事件（含座位与 info）', async () => {
    const user = userEvent.setup();
    render(<NightPanel />);
    await user.type(screen.getByLabelText('洗衣妇 信息记录（可选）'), '3 5 之中有洗衣妇');
    await user.click(screen.getByLabelText('洗衣妇'));

    expect(game().nightProgress?.checked).toContain('role:washerwoman');
    const e = events().find((ev) => ev.type === 'night_action');
    expect(e?.payload).toMatchObject({ roleId: 'washerwoman', stepKey: 'role:washerwoman' });
    expect(e?.seatNumbers).toEqual([1]);
    expect(e?.payload.info).toBe('3 5 之中有洗衣妇');
    expect(e?.round).toBe(0);
    expect(e?.phase).toBe('firstNight');
  });

  it('爪牙/恶魔信息记 system 事件；黄昏黎明只打勾不记事件', async () => {
    const user = userEvent.setup();
    render(<NightPanel />);
    await user.click(screen.getByLabelText('黄昏'));
    expect(events().filter((e) => e.type === 'night_action')).toHaveLength(0);

    await user.click(screen.getByLabelText('爪牙信息'));
    await user.click(screen.getByLabelText('恶魔信息'));
    const actions = events().filter((e) => e.type === 'night_action');
    expect(actions.map((e) => e.payload.roleId)).toEqual(['system:minion_info', 'system:demon_info']);
    expect(actions[0]?.seatNumbers).toEqual([3]); // 投毒者
    expect(actions[1]?.seatNumbers).toEqual([4]); // 小恶魔
  });

  it('取消勾选：进度移除并删除对应事件', async () => {
    const user = userEvent.setup();
    render(<NightPanel />);
    await user.click(screen.getByLabelText('占卜师'));
    expect(events().filter((e) => e.type === 'night_action')).toHaveLength(1);
    await user.click(screen.getByLabelText('占卜师'));
    expect(events().filter((e) => e.type === 'night_action')).toHaveLength(0);
    expect(game().nightProgress?.checked).not.toContain('role:fortune_teller');
  });

  it('勾选黎明：自动进入白天（round 1），夜单进度清空', async () => {
    const user = userEvent.setup();
    render(<NightPanel />);
    await user.click(screen.getByLabelText('黎明'));
    const g = game();
    expect(g.phase).toBe('day');
    expect(g.round).toBe(1);
    expect(g.nightProgress).toBeUndefined();
    expect(events().some((e) => e.type === 'phase_change' && e.payload.to === 'day')).toBe(true);
  });

  it('返回上一阶段按钮：firstNight→setup', async () => {
    const user = userEvent.setup();
    render(<NightPanel />);
    await user.click(screen.getByLabelText('黄昏'));
    await user.click(screen.getByRole('button', { name: /返回/ }));
    const g = game();
    expect(g.phase).toBe('setup');
    expect(g.round).toBe(0);
  });

  it('第二夜无信息步骤，标题显示第 2 夜', async () => {
    useGameStore.getState().finishNight();
    useGameStore.getState().enterNextNight();
    render(<NightPanel />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('第 2 夜');
    expect(screen.queryByText('爪牙信息')).toBeNull();
    expect(screen.queryByText('恶魔信息')).toBeNull();
  });
});

describe('DayPlaceholder（M3 前占位）', () => {
  it('显示第 1 个白天；入夜进入第 2 夜（round 不变）', async () => {
    const user = userEvent.setup();
    useGameStore.getState().finishNight();
    render(<DayPlaceholder />);
    expect(screen.getByRole('heading', { level: 2, name: '第 1 个白天' })).toBeTruthy();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: '入夜' }));
    const g = game();
    expect(g.phase).toBe('night');
    expect(g.round).toBe(1);
    expect(g.nightProgress).toEqual({ round: 1, checked: [] });
  });

  it('返回上一阶段按钮：day→上一夜，并恢复夜单进度', async () => {
    const user = userEvent.setup();
    useGameStore.getState().finishNight();      // day 1
    useGameStore.getState().enterNextNight();   // night 1
    useGameStore.getState().setNightStepChecked('role:poisoner', true);
    useEventStore.getState().append(
      createEvent(useGameStore.getState().game!, 'night_action', {
        seatNumbers: [3],
        payload: { stepKey: 'role:poisoner', roleId: 'poisoner' },
      }),
    );
    useGameStore.getState().finishNight();      // day 2
    render(<DayPlaceholder />);

    await user.click(screen.getByRole('button', { name: /返回/ }));
    const g = game();
    expect(g.phase).toBe('night');
    expect(g.round).toBe(1);
    expect(g.nightProgress?.checked).toContain('role:poisoner');
  });
});
