/**
 * 事件日志 store（F-06，ADR-017 #3）：GameEvent[] 内存态 + saveEvent 写通。
 * 与 gameStore 分离——复盘/时间线/统计（F-08/F-15）直接消费本 store。
 * 事件构造走 lib/events.createEvent（调用方补齐上下文后 append）。
 */
import { create } from 'zustand';
import { deleteEvent, loadEvents, saveEvent } from '../persistence/repo';
import type { GameEvent } from '../types/events';

interface EventsState {
  events: GameEvent[];
  /** 追加事件：内存 + 写通 IndexedDB */
  append(event: GameEvent): void;
  /**
   * 恢复已删除的事件（撤销删除）：优先插回原 index（调用方删除时记录），
   * 未给 index 时按 createdAt + id 定位；保留原 id/round/phase/createdAt（不甩到末尾）
   */
  restore(event: GameEvent, index?: number): void;
  /** 删除事件（夜单取消打勾等修正）：内存 + 删库 */
  remove(id: string): void;
  /**
   * 更新事件 payload（编辑备注/信息）：内存 + 写库（put 即 upsert），
   * 保留原 id/gameId/round/phase/createdAt 与位置
   */
  update(id: string, payload: Record<string, unknown>): void;
  /** 启动恢复：载入当前对局全部事件 */
  hydrate(gameId: string): Promise<void>;
  /** 仅清内存（对局删除/重建时调用；库内级联删除走 repo.deleteGame） */
  clear(): void;
}

export const useEventStore = create<EventsState>()((set, get) => ({
  events: [],

  append(event) {
    set((s) => ({ events: [...s.events, event] }));
    void saveEvent(event);
  },

  restore(event, index) {
    set((s) => {
      const events = [...s.events];
      const at =
        index === undefined
          ? events.findIndex(
              (e) => e.createdAt > event.createdAt || (e.createdAt === event.createdAt && e.id > event.id),
            )
          : Math.min(Math.max(index, 0), events.length);
      if (at === -1) events.push(event);
      else events.splice(at, 0, event);
      return { events };
    });
    void saveEvent(event);
  },

  remove(id) {
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    void deleteEvent(id);
  },

  update(id, payload) {
    const current = get().events.find((e) => e.id === id);
    if (!current) return;
    const updated = { ...current, payload };
    set((s) => ({ events: s.events.map((e) => (e.id === id ? updated : e)) }));
    void saveEvent(updated);
  },

  async hydrate(gameId) {
    const events = await loadEvents(gameId);
    set({ events });
  },

  clear() {
    set({ events: [] });
  },
}));
