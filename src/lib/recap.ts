/**
 * 复盘生成（F-08）：事件流 → GameRecap → Markdown
 */
import { HIDDEN_EVENT_TYPES } from './events';
import type { GameEvent, GameRecap } from '../types/events';
import type { Game } from '../types/game';

export function generateRecap(game: Game, events: GameEvent[]): GameRecap {
  const gameEvents = events
    .filter((e) => e.gameId === game.id && !HIDDEN_EVENT_TYPES.has(e.type))
    .sort((a, b) => a.createdAt - b.createdAt);

  const roundKeys = [...new Set(gameEvents.map((e) => `${e.round}:${e.phase}`))];
  const timeline = roundKeys.map((key) => {
    const [round, phase] = key.split(':') as [string, Game['phase']];
    return {
      round: Number(round),
      phase,
      events: gameEvents.filter((e) => `${e.round}:${e.phase}` === key),
    };
  });

  return {
    gameId: game.id,
    scriptName: game.scriptSnapshot.name,
    seating: game.seats.map((s) => ({
      seatNumber: s.seatNumber,
      playerName: s.playerName,
      roleId: s.roleId,
    })),
    timeline,
    outcome: game.outcome,
    generatedAt: Date.now(),
  };
}

/** Markdown 渲染。角色名从剧本快照解析；文案格式在此集中，后续 i18n。 */
export function recapToMarkdown(recap: GameRecap, roleName: (roleId: string) => string): string {
  const lines: string[] = [
    `# 血染钟楼复盘 — ${recap.scriptName}`,
    '',
    '## 座位表',
    '',
    ...recap.seating.map(
      (s) =>
        `- **${s.seatNumber} 号**${s.playerName ? `（${s.playerName}）` : ''}: ${s.roleId ? roleName(s.roleId) : '未知'}`,
    ),
    '',
    '## 时间线',
    '',
  ];

  for (const block of recap.timeline) {
    const phaseLabel =
      block.phase === 'firstNight'
        ? '首夜'
        : block.phase === 'night'
          ? `第 ${block.round} 夜`
          : block.phase === 'day'
            ? `第 ${block.round} 天`
            : block.phase;
    lines.push(`### ${phaseLabel}`, '');
    for (const e of block.events) {
      lines.push(`- [${e.type}] ${JSON.stringify(e.payload)}`);
    }
    lines.push('');
  }

  if (recap.outcome) {
    lines.push(
      '## 结局',
      '',
      `**${recap.outcome.winningTeam === 'good' ? '善良阵营' : '邪恶阵营'}获胜**${recap.outcome.reason ? ` — ${recap.outcome.reason}` : ''}`,
    );
  }
  return lines.join('\n');
}
