import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../i18n';
import { Timeline } from './Timeline';
import { useScriptStore } from '../stores/script';
import { useGameStore } from '../stores/game';
import { useEventStore } from '../stores/events';
import { createEvent } from '../lib/events';

const fixture = (name: string) => readFileSync(join(__dirname, '../../fixtures', name), 'utf-8');

beforeEach(() => {
  useScriptStore.getState().clear();
  useGameStore.getState().reset();
  useEventStore.getState().clear();
  useScriptStore.getState().importFromText(fixture('bra1n-tb-sample.json'));
  useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
  useGameStore.getState().assignRoleDraw(
    [
      { seatNumber: 1, roleId: 'washerwoman' },
      { seatNumber: 3, roleId: 'poisoner' },
      { seatNumber: 4, roleId: 'imp' },
    ],
    { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
    [],
  );
  useGameStore.getState().enterFirstNight();
});

describe('Timeline（F-06b 时间线）', () => {
  it('按 round+phase 分组：首夜 section + 系统步骤特判 + 角色行动含座位与 info', async () => {
    const store = useGameStore.getState();
    const game = useGameStore.getState().game!;
    const events = useEventStore.getState();
    events.append(createEvent(game, 'night_action', { seatNumbers: [3], payload: { stepKey: 'system:minion_info', roleId: 'system:minion_info' } }));
    events.append(
      createEvent(game, 'night_action', {
        seatNumbers: [1],
        payload: { stepKey: 'role:washerwoman', roleId: 'washerwoman', info: '3 5 之中有洗衣妇' },
      }),
    );
    store.finishNight();

    render(<Timeline />);
    expect(screen.getByText('首夜')).toBeTruthy();
    expect(screen.getByText('第 1 个白天')).toBeTruthy();
    expect(screen.getByText(/爪牙信息/)).toBeTruthy();
    expect(screen.getByText(/洗衣妇（座位 1）：3 5 之中有洗衣妇/)).toBeTruthy();
    expect(screen.getByText('进入白天')).toBeTruthy();
  });

  it('座位事件：换位/平移/增删渲染中文描述；setup 阶段操作不入流水', async () => {
    const store = useGameStore.getState();
    store.swapSeats(1, 2);
    store.rippleShiftSeat(2, 5);
    store.addSeat();
    store.removeSeat(6, true);

    const types = useEventStore.getState().events.filter((e) => e.type.startsWith('seat_'));
    expect(types.map((e) => e.type)).toEqual(['seat_swap', 'seat_swap', 'seat_add', 'seat_remove']);
    const removeEvent = types.find((e) => e.type === 'seat_remove');
    expect(removeEvent?.payload).toMatchObject({ seatNumber: 6, reuse: true });

    render(<Timeline />);
    expect(screen.getByText('换位：1 ⇄ 2')).toBeTruthy();
    expect(screen.getByText('平移：2 → 5')).toBeTruthy();
    expect(screen.getByText('新增座位 8')).toBeTruthy();
    expect(screen.getByText('移除座位 6')).toBeTruthy();
  });

  it('note 可编辑并保存', async () => {
    const user = userEvent.setup();
    const game = useGameStore.getState().game!;
    useEventStore.getState().append(createEvent(game, 'note', { payload: { text: '旧备注' } }));

    render(<Timeline />);
    await user.click(screen.getByRole('button', { name: '编辑' }));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, '新备注');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('新备注')).toBeTruthy();
    expect(screen.queryByText('旧备注')).toBeNull();
  });

  it('可删除用户事件并撤销', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const game = useGameStore.getState().game!;
    useEventStore.getState().append(createEvent(game, 'note', { payload: { text: '待删除' } }));

    render(<Timeline />);
    expect(screen.getByText('待删除')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '删除' }));
    expect(screen.queryByText('待删除')).toBeNull();

    await user.click(screen.getByRole('button', { name: '撤销' }));
    expect(screen.getByText('待删除')).toBeTruthy();
  });

  it('取消确认时不删除事件', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const game = useGameStore.getState().game!;
    useEventStore.getState().append(createEvent(game, 'note', { payload: { text: '保留' } }));

    render(<Timeline />);
    await user.click(screen.getByRole('button', { name: '删除' }));
    expect(screen.getByText('保留')).toBeTruthy();
  });

  it('保存空备注不修改事件且停留在编辑态', async () => {
    const user = userEvent.setup();
    const game = useGameStore.getState().game!;
    useEventStore.getState().append(createEvent(game, 'note', { payload: { text: '原备注' } }));

    render(<Timeline />);
    await user.click(screen.getByRole('button', { name: '编辑' }));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    const before = useEventStore.getState().events.length;
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(useEventStore.getState().events.length).toBe(before);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('取消编辑不修改备注', async () => {
    const user = userEvent.setup();
    const game = useGameStore.getState().game!;
    useEventStore.getState().append(createEvent(game, 'note', { payload: { text: '原备注' } }));

    render(<Timeline />);
    await user.click(screen.getByRole('button', { name: '编辑' }));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, '未保存');
    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(screen.getByText('原备注')).toBeTruthy();
    expect(screen.queryByText('未保存')).toBeNull();
  });

  it('无事件时不渲染', () => {
    useEventStore.getState().clear();
    const { container } = render(<Timeline />);
    expect(container.querySelector('.timeline')).toBeNull();
  });
});
