/**
 * Dexie (IndexedDB) schema — 见 docs/DATA-MODEL.md 第 4 节。
 * schema 变更须登记 DATA-MODEL.md 并递增 version。
 */
import Dexie, { type EntityTable } from 'dexie';
import type { Game } from '../types/game';
import type { GameEvent } from '../types/events';

export const db = new Dexie('chimekeeper') as Dexie & {
  games: EntityTable<Game, 'id'>;
  events: EntityTable<GameEvent, 'id'>;
};

db.version(1).stores({
  games: 'id, updatedAt',
  events: 'id, gameId, [gameId+round]',
});
