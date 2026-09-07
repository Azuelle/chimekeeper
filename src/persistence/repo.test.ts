import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  saveGame,
  loadCurrentGame,
  saveEvent,
  deleteEvent,
  loadEvents,
  deleteGame,
  clearAll,
} from './repo';
import { createEvent } from '../lib/events';
import type { Game } from '../types/game';

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    scriptSnapshot: { name: '测试剧本', roles: [] },
    seats: [],
    seatHighWater: 0,
    retiredSeatNumbers: [],
    reusePool: [],
    demonBluffs: [],
    phase: 'setup',
    round: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('repo（F-07a，fake-indexeddb）', () => {
  beforeEach(async () => {
    await clearAll();
  });

  it('saveGame → loadCurrentGame 取 updatedAt 最新一条（ADR-017 单一当前局）', async () => {
    await saveGame(makeGame({ id: 'g1', updatedAt: 100 }));
    await saveGame(makeGame({ id: 'g2', updatedAt: 200 }));
    await saveGame(makeGame({ id: 'g1', updatedAt: 300 }));
    expect((await loadCurrentGame())?.id).toBe('g1');
  });

  it('库空时 loadCurrentGame 返回 null', async () => {
    expect(await loadCurrentGame()).toBeNull();
  });

  it('saveEvent → loadEvents 按 createdAt 升序（时间线渲染序）', async () => {
    const base = { id: 'g1', round: 0, phase: 'setup' as const };
    const e1 = createEvent(base, 'note', { payload: { text: '早' } });
    e1.createdAt = 100;
    const e2 = createEvent(base, 'night_action', { payload: { roleId: 'monk' } });
    e2.createdAt = 200;
    await saveEvent(e2);
    await saveEvent(e1);
    const events = await loadEvents('g1');
    expect(events.map((e) => e.createdAt)).toEqual([100, 200]);
  });

  it('deleteEvent 只删单条', async () => {
    const base = { id: 'g1', round: 0, phase: 'setup' as const };
    const keep = createEvent(base, 'note');
    const drop = createEvent(base, 'note');
    await saveEvent(keep);
    await saveEvent(drop);
    await deleteEvent(drop.id);
    const events = await loadEvents('g1');
    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe(keep.id);
  });

  it('deleteGame 级联删除该局全部事件，不影响他局', async () => {
    await saveGame(makeGame({ id: 'g1' }));
    await saveGame(makeGame({ id: 'g2', updatedAt: 2 }));
    const base1 = { id: 'g1', round: 0, phase: 'setup' as const };
    const base2 = { id: 'g2', round: 0, phase: 'setup' as const };
    await saveEvent(createEvent(base1, 'note'));
    await saveEvent(createEvent(base2, 'note'));
    await deleteGame('g1');
    expect(await loadCurrentGame()).not.toBeNull();
    expect((await loadCurrentGame())?.id).toBe('g2');
    expect(await loadEvents('g1')).toEqual([]);
    expect(await loadEvents('g2')).toHaveLength(1);
  });
});
