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
  /** 删除事件（夜单取消打勾等修正）：内存 + 删库 */
  remove(id: string): void;
  /** 启动恢复：载入当前对局全部事件 */
  hydrate(gameId: string): Promise<void>;
  /** 仅清内存（对局删除/重建时调用；库内级联删除走 repo.deleteGame） */
  clear(): void;
}

export const useEventStore = create<EventsState>()((set) => ({
  events: [],

  append(event) {
    set((s) => ({ events: [...s.events, event] }));
    void saveEvent(event);
  },

  remove(id) {
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    void deleteEvent(id);
  },

  async hydrate(gameId) {
    const events = await loadEvents(gameId);
    set({ events });
  },

  clear() {
    set({ events: [] });
  },
}));
