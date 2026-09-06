import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
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
const faceName = (n: number) => `座位编号 ${String(n)}`;
const openMenu = async (user: ReturnType<typeof userEvent.setup>, n: number) => {
  await user.click(screen.getByRole('button', { name: faceName(n) }));
};

describe('SeatSetup（F-02 玩家卡 + 菜单）', () => {
  it('默认 7 人：生成座位环 + 菜单顶部文本框改昵称回写 store', async () => {
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);
    await user.click(screen.getByRole('button', { name: '生成座位' }));
    expect(game()?.seats).toHaveLength(7);

    await openMenu(user, 1);
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

  it('人数下限：输入小于 5 也被 clamp 到 5', async () => {
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);
    const countInput = screen.getByLabelText('玩家人数');
    await user.clear(countInput);
    await user.type(countInput, '3');
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

  it('交换座位：菜单发起 → 点选目标，住户交换、编号不动', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    useGameStore.getState().renameSeat(1, '张三');
    useGameStore.getState().renameSeat(3, '李四');
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);

    await openMenu(user, 1);
    await user.click(screen.getByRole('button', { name: '交换座位' }));
    await user.click(screen.getByRole('button', { name: faceName(3) }));

    expect(seat(1)?.playerName).toBe('李四');
    expect(seat(3)?.playerName).toBe('张三');
    expect(game()?.seats.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('交换座位：再点原座位 = 取消选择，不发生换位', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    useGameStore.getState().renameSeat(1, '张三');
    useGameStore.getState().renameSeat(3, '李四');
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);

    await openMenu(user, 1);
    await user.click(screen.getByRole('button', { name: '交换座位' }));
    await user.click(screen.getByRole('button', { name: faceName(1) }));

    expect(seat(1)?.playerName).toBe('张三');
    expect(seat(3)?.playerName).toBe('李四');
  });

  it('平移座位（涟漪式）：甲 1 号移去 3 号 → 乙丙顺延（1乙 2丙 3甲）', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 4);
    ['甲', '乙', '丙', '丁'].forEach((name, i) => useGameStore.getState().renameSeat(i + 1, name));
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);

    await openMenu(user, 1);
    await user.click(screen.getByRole('button', { name: '平移座位' }));
    await user.click(screen.getByRole('button', { name: faceName(3) }));

    expect(seat(1)?.playerName).toBe('乙');
    expect(seat(2)?.playerName).toBe('丙');
    expect(seat(3)?.playerName).toBe('甲');
    expect(seat(4)?.playerName).toBe('丁');
    // 锚号与显示顺序都不动
    expect(game()?.seats.map((s) => s.seatNumber)).toEqual([1, 2, 3, 4]);
  });

  it('移除座位（默认退役）：编号进退役表，环上移除', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);

    await openMenu(user, 7);
    await user.click(screen.getByRole('button', { name: '移除座位' }));
    await user.click(screen.getByRole('button', { name: '移除' }));

    expect(game()?.seats).toHaveLength(6);
    expect(seat(7)).toBeUndefined();
    expect(game()?.retiredSeatNumbers).toEqual([7]);
    expect(screen.getByText('退役编号：7')).toBeTruthy();
  });

  it('移除座位（勾选复用）：编号入复用池，再添加可复用该号', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);

    await openMenu(user, 5);
    await user.click(screen.getByRole('button', { name: '移除座位' }));
    await user.click(screen.getByRole('checkbox', { name: '将编号放入复用池' }));
    await user.click(screen.getByRole('button', { name: '移除' }));

    expect(game()?.retiredSeatNumbers).toEqual([]);
    expect(game()?.reusePool).toEqual([5]);

    await user.click(screen.getByRole('button', { name: '添加座位' }));
    expect(game()?.seats).toHaveLength(7);
    expect(seat(5)).toBeDefined();
    expect(game()?.reusePool).toEqual([]);
  });

  it('退役编号：启用后批量入池，下一次添加取最小号', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);

    // 依次移除 6、3（默认退役），退役表按输入顺序 [6, 3]，展示升序
    await openMenu(user, 6);
    await user.click(screen.getByRole('button', { name: '移除座位' }));
    await user.click(screen.getByRole('button', { name: '移除' }));
    await openMenu(user, 3);
    await user.click(screen.getByRole('button', { name: '移除座位' }));
    await user.click(screen.getByRole('button', { name: '移除' }));

    expect(screen.getByText('退役编号：3, 6')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '启用退役编号' }));
    expect(game()?.retiredSeatNumbers).toEqual([]);
    expect(game()?.reusePool).toEqual([3, 6]);
    expect(screen.queryByText(/退役编号：/)).toBeNull();

    // 池最小号 3 被优先消费
    await user.click(screen.getByRole('button', { name: '添加座位' }));
    expect(seat(3)).toBeDefined();
    expect(game()?.reusePool).toEqual([6]);
    expect(game()?.seatHighWater).toBe(7);
  });

  it('菜单内 M2/M3 项目置灰占位（disabled + 标注阶段）', async () => {
    useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
    const user = userEvent.setup();
    render(<SeatSetup onChangeScript={() => {}} />);

    await openMenu(user, 1);
    const assignRole = screen.getByRole('button', { name: /分配角色/ });
    const nominate = screen.getByRole('button', { name: /提名/ });
    expect((assignRole as HTMLButtonElement).disabled).toBe(true);
    expect((nominate as HTMLButtonElement).disabled).toBe(true);
    // 门控占位：M2 角色类 5 项 / M3 白天类 3 项，均带阶段标注
    expect(screen.getAllByRole('button', { name: /入夜阶段开放/ })).toHaveLength(5);
    expect(screen.getAllByRole('button', { name: /白天阶段开放/ })).toHaveLength(3);
  });
});
