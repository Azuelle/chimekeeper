import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../../i18n';
import { SeatSetup } from './SeatSetup';
import { useScriptStore } from '../../stores/script';
import { useGameStore } from '../../stores/game';

const fixture = (name: string) => readFileSync(join(__dirname, '../../../fixtures', name), 'utf-8');

beforeEach(() => {
  useScriptStore.getState().clear();
  useGameStore.getState().reset();
  useScriptStore.getState().importFromText(fixture('bra1n-tb-sample.json'));
});

const game = () => useGameStore.getState().game;
const seat = (n: number) => game()?.seats.find((s) => s.seatNumber === n);

describe('SeatSetup（F-02）', () => {
  it('默认 7 人：生成座位圈 + 昵称回写 store', async () => {
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);
    await user.click(screen.getByRole('button', { name: '生成座位' }));
    expect(game()?.seats).toHaveLength(7);
    await user.type(screen.getByLabelText('座位编号 1 昵称（可空）'), '阿明');
    expect(seat(1)?.playerName).toBe('阿明');
  });

  it('人数可改为 5 人局', async () => {
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);
    const countInput = screen.getByLabelText('玩家人数');
    await user.clear(countInput);
    await user.type(countInput, '5');
    await user.click(screen.getByRole('button', { name: '生成座位' }));
    expect(game()?.seats).toHaveLength(5);
  });

  it('添加座位：新编号 = 8', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);
    await user.click(screen.getByRole('button', { name: '添加座位' }));
    expect(game()?.seats).toHaveLength(8);
    expect(seat(8)).toBeDefined();
  });

  it('移除座位：confirm 确认后删除', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);
    const cards = screen.getAllByRole('listitem');
    await user.click(within(cards[6]!).getByRole('button', { name: '移除' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(game()?.seats).toHaveLength(6);
    confirmSpy.mockRestore();
  });

  it('移除座位：取消则不动', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);
    const cards = screen.getAllByRole('listitem');
    await user.click(within(cards[0]!).getByRole('button', { name: '移除' }));
    expect(game()?.seats).toHaveLength(7);
    confirmSpy.mockRestore();
  });

  it('换位：点选两个座位，住户交换、编号不动', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    useGameStore.getState().renameSeat(1, '张三');
    useGameStore.getState().renameSeat(3, '李四');
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);
    const cards = screen.getAllByRole('listitem');
    await user.click(within(cards[0]!).getByRole('button', { name: '换位' }));
    await user.click(within(cards[2]!).getByRole('button', { name: '换位' }));
    expect(seat(1)?.playerName).toBe('李四');
    expect(seat(3)?.playerName).toBe('张三');
    expect(game()?.seats.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('换位点同一个座位 = 取消选择', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);
    const cards = screen.getAllByRole('listitem');
    await user.click(within(cards[0]!).getByRole('button', { name: '换位' }));
    await user.click(within(cards[0]!).getByRole('button', { name: '换位' }));
    // 未发生任何换位
    expect(game()?.seats.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
