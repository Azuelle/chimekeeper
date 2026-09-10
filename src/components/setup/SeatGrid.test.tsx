import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import '../../i18n';
import { SeatGrid } from './SeatGrid';
import { useGameStore } from '../../stores/game';
import { useEventStore } from '../../stores/events';

beforeEach(() => {
  useGameStore.setState({ game: null, hydrated: true });
  useEventStore.getState().clear();
});

const baseSeat = {
  seatNumber: 1,
  displayOrder: 0,
  alive: true,
  hasVoteToken: true,
  reminderTokens: [],
};

describe('SeatGrid（魔典座位环）', () => {
  it('存活玩家不显示死亡标记，死亡玩家显示 ☠️ 且 token 灰化', () => {
    render(
      <SeatGrid
        seats={[
          { ...baseSeat, seatNumber: 1, playerName: 'Alive' },
          { ...baseSeat, seatNumber: 2, playerName: 'Dead', alive: false },
        ]}
      />,
    );

    expect(screen.getByLabelText(/座位编号 1/)).toBeTruthy();
    expect(screen.queryByLabelText(/座位编号 1.*已死亡/)).toBeNull();
    expect(screen.getByLabelText(/座位编号 2.*已死亡/)).toBeTruthy();
    expect(screen.getByText('☠️')).toBeTruthy();
  });
});
