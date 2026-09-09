/**
 * 持久化仓库（F-07a，ADR-017）：Dexie 读写的一层薄封装。
 *
 * - 单一当前局：loadCurrentGame 按 updatedAt 取最新一条（多局列表属 M4 F-07b）
 * - deleteGame 级联删除该局全部事件（v1 单局模型防脏数据）
 * - 环境无 indexedDB（部分测试环境）时静默跳过，不产生未处理拒绝
 */
import { db } from './db';
import type { Game } from '../types/game';
import type { GameEvent } from '../types/events';

const hasIdb = (): boolean => typeof indexedDB !== 'undefined';

/** 同毫秒多次写入时保证 updatedAt 严格递增，使 loadCurrentGame 结果确定 */
let saveCounter = 0;

/** 写入/覆盖对局（写通，fire-and-forget 调用） */
export async function saveGame(game: Game): Promise<void> {
  if (!hasIdb()) return;
  // 在 game.updatedAt 上加亚毫秒计数，避免同 ms 写入导致顺序不确定
  const updatedAt = game.updatedAt + (saveCounter++ % 1000) / 1000;
  await db.games.put({ ...game, updatedAt });
}

/** 取最近更新的对局；库空返回 null */
export async function loadCurrentGame(): Promise<Game | null> {
  if (!hasIdb()) return null;
  return (await db.games.orderBy('updatedAt').last()) ?? null;
}

/** 按 id 读取单局；不存在返回 null */
export async function loadGame(gameId: string): Promise<Game | null> {
  if (!hasIdb()) return null;
  return (await db.games.get(gameId)) ?? null;
}

/** 列出全部对局，按最近更新倒序（F-07b 多局列表） */
export async function listGames(): Promise<Game[]> {
  if (!hasIdb()) return [];
  return db.games.orderBy('updatedAt').reverse().toArray();
}

/** 写入单条事件 */
export async function saveEvent(event: GameEvent): Promise<void> {
  if (!hasIdb()) return;
  await db.events.put(event);
}

/** 删除单条事件（夜单取消打勾等修正） */
export async function deleteEvent(id: string): Promise<void> {
  if (!hasIdb()) return;
  await db.events.delete(id);
}

/** 按时间顺序载入某局全部事件（时间线渲染顺序） */
export async function loadEvents(gameId: string): Promise<GameEvent[]> {
  if (!hasIdb()) return [];
  const events = await db.events.where('gameId').equals(gameId).sortBy('createdAt');
  // 同毫秒批量写入时以 id 稳定排序
  return events.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

/** 删除对局并级联删除其全部事件（重开/换剧本时调用） */
export async function deleteGame(gameId: string): Promise<void> {
  if (!hasIdb()) return;
  await db.transaction('rw', db.games, db.events, async () => {
    await db.games.delete(gameId);
    await db.events.where('gameId').equals(gameId).delete();
  });
}

/** 清空全部表（调试/测试用） */
export async function clearAll(): Promise<void> {
  if (!hasIdb()) return;
  await Promise.all([db.games.clear(), db.events.clear()]);
}
