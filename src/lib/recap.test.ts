import { describe, it, expect } from 'vitest';
import { generateRecap, recapToMarkdown } from './recap';
import type { Game } from '../types/game';
import type { GameEvent } from '../types/events';

const game: Game = {
  id: 'g1',
  scriptSnapshot: { name: '暗流涌动', roles: [] },
  seatHighWater: 2,
  retiredSeatNumbers: [],
  reusePool: [],
  seats: [
    { seatNumber: 1, displayOrder: 1, playerName: '小明', roleId: 'monk', alive: true, hasVoteToken: true, reminderTokens: [] },
    { seatNumber: 2, displayOrder: 2, roleId: 'imp', alive: true, hasVoteToken: true, reminderTokens: [] },
  ],
  demonBluffs: [],
  phase: 'ended',
  round: 2,
  createdAt: 0,
  updatedAt: 0,
  outcome: { winningTeam: 'good', reason: '恶魔被处决' },
};

const events: GameEvent[] = [
  { id: 'e1', gameId: 'g1', type: 'night_action', round: 0, phase: 'firstNight', seatNumbers: [1], payload: { roleId: 'monk' }, createdAt: 1 },
  { id: 'e2', gameId: 'g1', type: 'nomination', round: 1, phase: 'day', seatNumbers: [1, 2], payload: { nominatorSeat: 1, nominatedSeat: 2 }, createdAt: 2 },
  { id: 'e3', gameId: 'g1', type: 'game_end', round: 2, phase: 'ended', seatNumbers: [], payload: { winningTeam: 'good' }, createdAt: 3 },
  // 别的对局的事件不应混入
  { id: 'e4', gameId: 'other', type: 'note', round: 0, phase: 'setup', seatNumbers: [], payload: { text: 'x' }, createdAt: 4 },
];

describe('generateRecap', () => {
  it('只包含本对局事件，按 round:phase 分组', () => {
    const recap = generateRecap(game, events);
    expect(recap.timeline).toHaveLength(3);
    expect(recap.timeline.flatMap((t) => t.events).map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });
});

describe('recapToMarkdown', () => {
  it('生成含座位表与结局的 Markdown', () => {
    const md = recapToMarkdown(generateRecap(game, events), (id) => ({ monk: '僧侣', imp: '小恶魔' })[id] ?? id);
    expect(md).toContain('# 血染钟楼复盘 — 暗流涌动');
    expect(md).toContain('**1 号**（小明）: 僧侣');
    expect(md).toContain('首夜');
    expect(md).toContain('**善良阵营获胜** — 恶魔被处决');
  });
});
