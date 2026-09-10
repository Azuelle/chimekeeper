import { act, render, screen } from '@testing-library/react';
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
    useEventStore.getState().append(createEvent(useGameStore.getState().game!, 'note', { payload: { text: '白天备注' } }));

    render(<Timeline />);
    expect(screen.getByText('首夜')).toBeTruthy();
    expect(screen.getByText('第 1 个白天')).toBeTruthy();
    expect(screen.getByText(/爪牙信息/)).toBeTruthy();
    expect(screen.getByText(/洗衣妇（座位 1）：3 5 之中有洗衣妇/)).toBeTruthy();
    expect(screen.queryByText('进入白天')).toBeNull();
    expect(screen.getByText('白天备注')).toBeTruthy();
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

  it('编辑事件原地更新，不改变顺序、id 与 createdAt', async () => {
    const user = userEvent.setup();
    const game = useGameStore.getState().game!;
    useEventStore.getState().append(createEvent(game, 'note', { payload: { text: '第一条' } }));
    useEventStore.getState().append(createEvent(game, 'note', { payload: { text: '第二条' } }));
    const beforeEvents = useEventStore.getState().events;
    const firstNote = beforeEvents.find((e) => e.type === 'note')!;

    render(<Timeline />);
    const editButtons = screen.getAllByRole('button', { name: '编辑' });
    await user.click(editButtons[0]!);
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, '第一条已编辑');
    await user.click(screen.getByRole('button', { name: '保存' }));

    const afterEvents = useEventStore.getState().events;
    expect(afterEvents.length).toBe(beforeEvents.length);
    const updated = afterEvents.find((e) => e.id === firstNote.id)!;
    expect(updated.createdAt).toBe(firstNote.createdAt);
    expect(updated.payload.text).toBe('第一条已编辑');
    expect(afterEvents.filter((e) => e.type === 'note').map((e) => e.payload.text)).toEqual([
      '第一条已编辑',
      '第二条',
    ]);
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

  it('night_action 的 info 可编辑（F-06d）', async () => {
    const user = userEvent.setup();
    const game = useGameStore.getState().game!;
    useEventStore.getState().append(
      createEvent(game, 'night_action', {
        seatNumbers: [1],
        payload: { stepKey: 'role:washerwoman', roleId: 'washerwoman', info: '3 5 之中有洗衣妇' },
      }),
    );

    render(<Timeline />);
    expect(screen.getByText(/3 5 之中有洗衣妇/)).toBeTruthy();
    await user.click(screen.getAllByRole('button', { name: '编辑' })[0]!);
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, '修正后的信息');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText(/修正后的信息/)).toBeTruthy();
    const ev = useEventStore.getState().events.find((e) => e.type === 'night_action');
    expect(ev?.payload.info).toBe('修正后的信息');
    expect(ev?.payload.stepKey).toBe('role:washerwoman');
  });

  it('death 事件可删除并恢复座位存活；撤销删除后再次死亡', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    useGameStore.getState().registerDeath(1, 'night');

    render(<Timeline />);
    expect(useGameStore.getState().game?.seats.find((s) => s.seatNumber === 1)?.alive).toBe(false);

    await user.click(screen.getByRole('button', { name: '删除' }));
    expect(useEventStore.getState().events.some((e) => e.type === 'death')).toBe(false);
    expect(useGameStore.getState().game?.seats.find((s) => s.seatNumber === 1)?.alive).toBe(true);

    await user.click(screen.getByRole('button', { name: '撤销' }));
    expect(useEventStore.getState().events.some((e) => e.type === 'death')).toBe(true);
    expect(useGameStore.getState().game?.seats.find((s) => s.seatNumber === 1)?.alive).toBe(false);
  });

  it('删除较早的死亡事件不会复活已被后续死亡事件覆盖的座位', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    useGameStore.getState().registerDeath(1, 'night');
    useGameStore.getState().registerRevival(1);
    useGameStore.getState().registerDeath(1, 'other');

    render(<Timeline />);
    expect(useGameStore.getState().game?.seats.find((s) => s.seatNumber === 1)?.alive).toBe(false);

    // 删除 DOM 中最早的一条死亡事件
    await user.click(screen.getAllByRole('button', { name: '删除' })[0]!);
    expect(useGameStore.getState().game?.seats.find((s) => s.seatNumber === 1)?.alive).toBe(false);
  });

  it('撤销删除较早的死亡事件原位插回，且不改错生死状态', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    useGameStore.getState().registerDeath(1, 'night');
    useGameStore.getState().registerRevival(1);
    useGameStore.getState().registerDeath(1, 'other');
    const before = useEventStore.getState().events;
    const earliest = before.find((e) => e.type === 'death')!;
    const originalIndex = before.findIndex((e) => e.id === earliest.id);

    render(<Timeline />);
    await user.click(screen.getAllByRole('button', { name: '删除' })[0]!);
    await user.click(screen.getByRole('button', { name: '撤销' }));

    const after = useEventStore.getState().events;
    const restored = after.find((e) => e.id === earliest.id)!;
    expect(after.findIndex((e) => e.id === earliest.id)).toBe(originalIndex);
    expect(restored.createdAt).toBe(earliest.createdAt);
    // 后续的死亡事件仍是最新 → 不应因撤销较早死亡而复活
    expect(useGameStore.getState().game?.seats.find((s) => s.seatNumber === 1)?.alive).toBe(false);
  });

  it('某阶段只有 phase_change 时显示空态文案', () => {
    render(<Timeline />);
    expect(screen.getByText('未记录事件')).toBeTruthy();
  });

  it('无事件时不渲染', () => {
    useEventStore.getState().clear();
    const { container } = render(<Timeline />);
    expect(container.querySelector('.timeline')).toBeNull();
  });

  it('白天 section 无 execution 时给出 suggestion；有 execution 时不显示', async () => {
    useGameStore.getState().finishNight();
    const dayGame = useGameStore.getState().game!;
    useEventStore.getState().append(createEvent(dayGame, 'nomination', { payload: { nominatorSeat: 1, nominatedSeat: 2 } }));

    const { unmount } = render(<Timeline />);
    expect(screen.getByText('本白天尚未登记处决')).toBeTruthy();

    act(() => {
      useEventStore.getState().append(createEvent(dayGame, 'execution', { seatNumbers: [2], payload: { died: true } }));
    });
    unmount();
    render(<Timeline />);
    expect(screen.queryByText('本白天尚未登记处决')).toBeNull();
  });

  it('非白天 section 不显示 execution suggestion', () => {
    const game = useGameStore.getState().game!;
    useEventStore.getState().append(createEvent(game, 'night_action', { seatNumbers: [1], payload: { roleId: 'imp' } }));

    render(<Timeline />);
    expect(screen.queryByText('本白天尚未登记处决')).toBeNull();
  });
});
