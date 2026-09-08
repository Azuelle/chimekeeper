import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
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

  it('无事件时不渲染', () => {
    useEventStore.getState().clear();
    const { container } = render(<Timeline />);
    expect(container.querySelector('.timeline')).toBeNull();
  });
});
