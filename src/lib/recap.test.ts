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
  { id: 'e1', gameId: 'g1', type: 'phase_change', round: 0, phase: 'firstNight', seatNumbers: [], payload: { from: 'setup', to: 'firstNight' }, createdAt: 1 },
  { id: 'e2', gameId: 'g1', type: 'night_action', round: 0, phase: 'firstNight', seatNumbers: [1], payload: { roleId: 'monk', info: '保护了 2 号' }, createdAt: 2 },
  { id: 'e3', gameId: 'g1', type: 'seat_add', round: 0, phase: 'firstNight', seatNumbers: [], payload: { seatNumber: 3 }, createdAt: 3 },
  { id: 'e4', gameId: 'g1', type: 'nomination', round: 1, phase: 'day', seatNumbers: [], payload: { nominatorSeat: 1, nominatedSeat: 2 }, createdAt: 4 },
  { id: 'e5', gameId: 'g1', type: 'vote', round: 1, phase: 'day', seatNumbers: [], payload: { votesFor: 3, votesNeeded: 3, passed: true }, createdAt: 5 },
  { id: 'e6', gameId: 'g1', type: 'execution', round: 1, phase: 'day', seatNumbers: [2], payload: { died: true }, createdAt: 6 },
  { id: 'e7', gameId: 'g1', type: 'death', round: 1, phase: 'day', seatNumbers: [2], payload: { cause: 'execution' }, createdAt: 7 },
  { id: 'e8', gameId: 'g1', type: 'revival', round: 2, phase: 'day', seatNumbers: [2], payload: {}, createdAt: 8 },
  { id: 'e9', gameId: 'g1', type: 'game_end', round: 3, phase: 'ended', seatNumbers: [], payload: { winningTeam: 'good' }, createdAt: 9 },
  // 别的对局的事件不应混入
  { id: 'e10', gameId: 'other', type: 'note', round: 0, phase: 'setup', seatNumbers: [], payload: { text: 'x' }, createdAt: 10 },
];

describe('generateRecap', () => {
  it('只包含本对局事件，过滤 phase_change，按 round:phase 分组', () => {
    const recap = generateRecap(game, events);
    expect(recap.timeline).toHaveLength(4);
    expect(recap.timeline.flatMap((t) => t.events).map((e) => e.id)).toEqual([
      'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9',
    ]);
  });
});

describe('recapToMarkdown', () => {
  it('生成含座位表与结局的 Markdown', () => {
    const md = recapToMarkdown(generateRecap(game, events), (id) => ({ monk: '僧侣', imp: '小恶魔' })[id] ?? id);
    expect(md).toContain('# 血染钟楼复盘 — 暗流涌动');
    expect(md).toContain('**1 号**（小明）: 僧侣');
    expect(md).toContain('首夜');
    expect(md).toContain('僧侣（座位 1）：保护了 2 号');
    expect(md).toContain('新增座位 3');
    expect(md).toContain('1 号提名 2 号');
    expect(md).toContain('投票：3 / 3 票');
    expect(md).toContain('2 号被处决 （死亡）');
    expect(md).toContain('2 号死亡（原因：execution）');
    expect(md).toContain('2 号复活');
    expect(md).toContain('**善良阵营获胜** — 恶魔被处决');
    expect(md).not.toContain('phase_change');
  });

  it('分支覆盖：未记票数、未死亡处决、系统信息、平移/换位、空 note、移除座位、夜晚阶段、未知 system 角色', () => {
    const custom: GameEvent[] = [
      { id: 'c1', gameId: 'g1', type: 'vote', round: 1, phase: 'day', seatNumbers: [], payload: { votesNeeded: 3 }, createdAt: 1 },
      { id: 'c2', gameId: 'g1', type: 'execution', round: 1, phase: 'day', seatNumbers: [3], payload: { died: false }, createdAt: 2 },
      { id: 'c3', gameId: 'g1', type: 'night_action', round: 0, phase: 'firstNight', seatNumbers: [1, 2], payload: { roleId: 'system:minion_info' }, createdAt: 3 },
      { id: 'c4', gameId: 'g1', type: 'night_action', round: 0, phase: 'firstNight', seatNumbers: [3], payload: { roleId: 'system:demon_info', info: '恶魔信息' }, createdAt: 4 },
      { id: 'c5', gameId: 'g1', type: 'seat_swap', round: 1, phase: 'day', seatNumbers: [], payload: { seatA: 1, seatB: 2, ripple: true }, createdAt: 5 },
      { id: 'c6', gameId: 'g1', type: 'seat_swap', round: 1, phase: 'day', seatNumbers: [], payload: { seatA: 1, seatB: 3 }, createdAt: 6 },
      { id: 'c7', gameId: 'g1', type: 'seat_remove', round: 1, phase: 'day', seatNumbers: [], payload: { seatNumber: 5 }, createdAt: 7 },
      { id: 'c8', gameId: 'g1', type: 'note', round: 1, phase: 'day', seatNumbers: [], payload: { text: 123 }, createdAt: 8 },
      { id: 'c9', gameId: 'g1', type: 'night_action', round: 2, phase: 'night', seatNumbers: [], payload: { roleId: 'system:other' }, createdAt: 9 },
      { id: 'c10', gameId: 'g1', type: 'role_change' as GameEvent['type'], round: 1, phase: 'day', seatNumbers: [3], payload: { fromRoleId: 'imp', toRoleId: 'scarlet_woman' }, createdAt: 10 },
    ];
    const md = recapToMarkdown(generateRecap(game, custom), (id) => id);
    expect(md).toContain('投票：未记票数（过半需要 3 票）');
    expect(md).toContain('3 号被处决 （未死亡）');
    expect(md).toContain('爪牙信息（座位 1、2）');
    expect(md).toContain('恶魔信息（座位 3）：恶魔信息');
    expect(md).toContain('平移：1 → 2');
    expect(md).toContain('换位：1 ⇄ 3');
    expect(md).toContain('移除座位 5');
    expect(md).toContain('第 2 夜');
    expect(md).toContain('system:other');
    expect(md).toContain('[role_change]');
  });
});
