import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseScript } from '../lib/scriptParser';
import { createEvent } from '../lib/events';
import { useGameStore } from './game';
import { useEventStore } from './events';
import { loadCurrentGame, loadEvents, clearAll } from '../persistence/repo';

const script = (() => {
  const r = parseScript(readFileSync(join(__dirname, '../../fixtures/bra1n-tb-sample.json'), 'utf-8'));
  if (!r.ok) throw new Error('fixture 解析失败');
  return r.script;
})();

beforeEach(async () => {
  await clearAll();
  useGameStore.getState().reset();
  useGameStore.setState({ game: null, hydrated: false });
});

describe('gameStore 写通持久化（ADR-017 双写）', () => {
  it('createGame → 库里有对局；后续变更同步落库', async () => {
    useGameStore.getState().createGame(script, 5);
    const id = useGameStore.getState().game!.id;
    let saved = await loadCurrentGame();
    expect(saved?.id).toBe(id);

    useGameStore.getState().renameSeat(1, '阿明');
    saved = await loadCurrentGame();
    expect(saved?.seats.find((s) => s.seatNumber === 1)?.playerName).toBe('阿明');
  });

  it('hydrate：杀后台恢复对局 + 事件流（M2 验收核心链路）', async () => {
    useGameStore.getState().createGame(script, 5);
    const game = useGameStore.getState().game!;
    const note = createEvent(game, 'note', { payload: { text: '恢复测试' } });
    useEventStore.getState().append(note);

    // 模拟杀后台：清内存（不删库），hydrate 后完整恢复
    useGameStore.setState({ game: null, hydrated: false });
    useEventStore.getState().clear();
    await useGameStore.getState().hydrate();

    const restored = useGameStore.getState().game;
    expect(restored?.id).toBe(game.id);
    expect(restored?.seats).toHaveLength(5);
    expect(useGameStore.getState().hydrated).toBe(true);
    expect(useEventStore.getState().events.map((e) => e.id)).toEqual([note.id]);
  });

  it('reset：删库级联事件，内存与 Dexie 双清', async () => {
    useGameStore.getState().createGame(script, 5);
    const game = useGameStore.getState().game!;
    useEventStore.getState().append(createEvent(game, 'note'));

    useGameStore.getState().reset();
    expect(useGameStore.getState().game).toBeNull();
    expect(useEventStore.getState().events).toEqual([]);

    // reset 是 fire-and-forget 删库（ADR-017 接受的竞态窗口），等 Dexie 落定再断言
    await new Promise((r) => setTimeout(r, 50));
    await expect(loadCurrentGame()).resolves.toBeNull();
    await expect(loadEvents(game.id)).resolves.toEqual([]);
  });

  it('库空时 hydrate：置空 + hydrated 置位', async () => {
    await useGameStore.getState().hydrate();
    expect(useGameStore.getState().game).toBeNull();
    expect(useGameStore.getState().hydrated).toBe(true);
  });

  it('loadGame：从多局列表中恢复任意对局为当前对局（F-07b）', async () => {
    useGameStore.getState().createGame(script, 5);
    const g1 = useGameStore.getState().game!;
    useEventStore.getState().append(createEvent(g1, 'note', { payload: { text: 'g1 note' } }));

    // 创建第二局（createGame 不删旧局，只清内存事件），使其成为当前对局
    useGameStore.getState().createGame(script, 7);
    const g2 = useGameStore.getState().game!;
    await expect(loadCurrentGame()).resolves.toMatchObject({ id: g2.id });

    // 恢复到 g1
    await useGameStore.getState().loadGame(g1.id);
    expect(useGameStore.getState().game?.id).toBe(g1.id);
    expect(useGameStore.getState().game?.seats).toHaveLength(5);
    expect(useEventStore.getState().events.map((e) => e.payload.text)).toEqual(['g1 note']);
  });
});
