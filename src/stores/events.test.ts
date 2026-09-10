import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { useEventStore } from './events';

beforeEach(() => {
  useEventStore.getState().clear();
});

describe('events store', () => {
  it('update 原地替换 payload 并保持 id/createdAt/顺序', () => {
    const ev = {
      id: 'a',
      gameId: 'g',
      type: 'note' as const,
      round: 1,
      phase: 'day' as const,
      seatNumbers: [],
      payload: { text: 'old' },
      createdAt: 123,
    };
    useEventStore.getState().append(ev);
    useEventStore.getState().append({ ...ev, id: 'b', payload: { text: 'other' }, createdAt: 124 });

    useEventStore.getState().update('a', { text: 'new' });

    const events = useEventStore.getState().events;
    expect(events.length).toBe(2);
    expect(events[0]!.id).toBe('a');
    expect(events[0]!.createdAt).toBe(123);
    expect(events[0]!.payload.text).toBe('new');
    expect(events[1]!.payload.text).toBe('other');
  });

  it('restore 按原 index 插回，保留 id/createdAt', () => {
    const mk = (id: string, createdAt: number) => ({
      id,
      gameId: 'g',
      type: 'note' as const,
      round: 1,
      phase: 'day' as const,
      seatNumbers: [],
      payload: { text: id },
      createdAt,
    });
    useEventStore.getState().append(mk('a', 1));
    useEventStore.getState().append(mk('c', 3));
    useEventStore.getState().restore(mk('b', 2), 1);

    const events = useEventStore.getState().events;
    expect(events.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(events[1]!.createdAt).toBe(2);
  });

  it('restore 未给 index 时按 createdAt 定位', () => {
    const mk = (id: string, createdAt: number) => ({
      id,
      gameId: 'g',
      type: 'note' as const,
      round: 1,
      phase: 'day' as const,
      seatNumbers: [],
      payload: { text: id },
      createdAt,
    });
    useEventStore.getState().append(mk('a', 1));
    useEventStore.getState().append(mk('c', 3));
    useEventStore.getState().restore(mk('b', 2));

    expect(useEventStore.getState().events.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});
