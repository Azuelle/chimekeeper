import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../../i18n';
import { Drawing } from './Drawing';
import { useScriptStore } from '../../stores/script';
import { useGameStore } from '../../stores/game';
import { useEventStore } from '../../stores/events';
import { roleById } from '../../lib/roleMap';

const fixture = (name: string) => readFileSync(join(__dirname, '../../../fixtures', name), 'utf-8');

beforeEach(() => {
  vi.restoreAllMocks();
  useScriptStore.getState().clear();
  useGameStore.getState().reset();
  useEventStore.getState().clear();
  useScriptStore.getState().importFromText(fixture('official-tool-tb-sample.json'));
  useGameStore.getState().createGame(useScriptStore.getState().script!, 7);
});

const game = () => useGameStore.getState().game!;

describe('Drawing（F-03 抽袋，ADR-008）', () => {
  it('默认 7 人构成 + 男爵设置调整提示高亮', () => {
    render(<Drawing onBack={() => {}} />);
    expect(screen.getByText(/官方默认构成（7 人）/)).toBeTruthy();
    expect(screen.getByText(/5 镇民/)).toBeTruthy();
    expect(screen.getByText('男爵')).toBeTruthy();
  });

  it('手动 +/- 调整构成，总数不符给醒目警告但不阻止操作', async () => {
    const user = userEvent.setup();
    render(<Drawing onBack={() => {}} />);
    await user.click(screen.getByRole('button', { name: '外来者 +1' }));
    expect(screen.getByText('袋内 8 个角色 / 7 名玩家')).toBeTruthy();
    expect(screen.getByText(/不一致/)).toBeTruthy();
    // 警告不阻止：随机分配按钮仍可点
    expect((screen.getByRole('button', { name: '随机分配' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('随机分配：全部座位获角色+实际阵营，伪装默认 2 镇民 + 1 外来者', async () => {
    const user = userEvent.setup();
    // 外来者 +1（男爵局 5TF/2OS/1MN/1DM = 8 ≠ 7，先减镇民凑 7：4/2/1/0? 用 4镇民+1外来者+1爪牙+1恶魔
    render(<Drawing onBack={() => {}} />);
    await user.click(screen.getByRole('button', { name: '镇民 -1' }));
    await user.click(screen.getByRole('button', { name: '外来者 +1' }));
    await user.click(screen.getByRole('button', { name: '随机分配' }));

    const g = game();
    expect(g.seats.every((s) => s.roleId !== undefined && s.alignment !== undefined)).toBe(true);
    expect(g.composition).toEqual({ townsfolk: 4, outsider: 1, minion: 1, demon: 1 });
    expect(g.demonBluffs).toHaveLength(3);
    const rolesById = roleById(g.scriptSnapshot.roles);
    const bluffTeams = g.demonBluffs.map((id) => rolesById.get(id)?.team);
    expect(bluffTeams.filter((t) => t === 'townsfolk')).toHaveLength(2);
    expect(bluffTeams.filter((t) => t === 'outsider')).toHaveLength(1);
  });

  it('手动换角：下拉改角色，阵营随之更新', async () => {
    const user = userEvent.setup();
    render(<Drawing onBack={() => {}} />);
    await user.click(screen.getByRole('button', { name: '随机分配' }));

    await user.selectOptions(screen.getByLabelText('座位 1 角色'), 'imp');
    const after = game().seats.find((s) => s.seatNumber === 1)!;
    expect(after).toMatchObject({ roleId: 'imp', alignment: 'evil' });
  });

  it('入夜：未分配完禁用；分配后确认进入 firstNight 并记 phase_change', async () => {
    const user = userEvent.setup();
    render(<Drawing onBack={() => {}} />);
    expect((screen.getByRole('button', { name: '入夜（首夜）' }) as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: '随机分配' }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: '入夜（首夜）' }));

    const g = game();
    expect(g.phase).toBe('firstNight');
    expect(g.round).toBe(0);
    expect(g.nightProgress).toEqual({ round: 0, checked: [] });
    const events = useEventStore.getState().events;
    expect(events.some((e) => e.type === 'phase_change' && e.payload.to === 'firstNight')).toBe(true);
  });
});
