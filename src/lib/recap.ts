/**
 * 复盘生成（F-08）：事件流 → GameRecap → Markdown
 */
import type { GameEvent, GameRecap } from '../types/events';
import type { Game } from '../types/game';

/** 复盘不展示进度元事件：时间线 section 标题已表达阶段 */
const HIDDEN_RECAP_TYPES = new Set<GameEvent['type']>(['phase_change']);

export function generateRecap(game: Game, events: GameEvent[]): GameRecap {
  const gameEvents = events
    .filter((e) => e.gameId === game.id && !HIDDEN_RECAP_TYPES.has(e.type))
    .sort((a, b) => a.createdAt - b.createdAt);

  const roundKeys = [...new Set(gameEvents.map((e) => `${e.round}:${e.phase}`))];
  const timeline = roundKeys
    .map((key) => {
      const [round, phase] = key.split(':') as [string, Game['phase']];
      return {
        round: Number(round),
        phase,
        events: gameEvents.filter((e) => `${e.round}:${e.phase}` === key),
      };
    })
    .filter((block) => block.events.length > 0);

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

function recapEventLine(e: GameEvent, roleName: (roleId: string) => string): string {
  const seat = String(e.seatNumbers[0] ?? '');
  switch (e.type) {
    case 'night_action': {
      const roleId = typeof e.payload.roleId === 'string' ? e.payload.roleId : '';
      const name = roleId.startsWith('system:')
        ? roleId === 'system:minion_info'
          ? '爪牙信息'
          : roleId === 'system:demon_info'
            ? '恶魔信息'
            : roleId
        : (roleName(roleId) ?? roleId);
      const seats = e.seatNumbers.length > 0 ? `（座位 ${e.seatNumbers.join('、')}）` : '';
      const info = typeof e.payload.info === 'string' && e.payload.info ? `：${e.payload.info}` : '';
      return `${name}${seats}${info}`;
    }
    case 'seat_add':
      return `新增座位 ${String(e.payload.seatNumber ?? '')}`;
    case 'seat_remove':
      return `移除座位 ${String(e.payload.seatNumber ?? '')}`;
    case 'seat_swap':
      return e.payload.ripple === true
        ? `平移：${String(e.payload.seatA ?? '')} → ${String(e.payload.seatB ?? '')}`
        : `换位：${String(e.payload.seatA ?? '')} ⇄ ${String(e.payload.seatB ?? '')}`;
    case 'note':
      return typeof e.payload.text === 'string' ? e.payload.text : '';
    case 'nomination':
      return `${String(e.payload.nominatorSeat ?? '')} 号提名 ${String(e.payload.nominatedSeat ?? '')} 号`;
    case 'vote': {
      const votesFor = e.payload.votesFor;
      if (typeof votesFor !== 'number') return `投票：未记票数（过半需要 ${String(e.payload.votesNeeded ?? '')} 票）`;
      return `投票：${String(votesFor)} / ${String(e.payload.votesNeeded ?? '')} 票`;
    }
    case 'execution': {
      const diedSuffix = e.payload.died === true ? '（死亡）' : '（未死亡）';
      return `${seat} 号被处决 ${diedSuffix}`;
    }
    case 'death': {
      const cause = e.payload.cause;
      const causeText = typeof cause === 'string' ? `（原因：${cause}）` : '';
      return `${seat} 号死亡${causeText}`;
    }
    case 'revival':
      return `${seat} 号复活`;
    case 'game_end': {
      const team = typeof e.payload.winningTeam === 'string' ? e.payload.winningTeam : '';
      return `游戏结束：${team === 'good' ? '善良阵营' : team === 'evil' ? '邪恶阵营' : team}获胜`;
    }
    default:
      return `[${e.type}] ${JSON.stringify(e.payload)}`;
  }
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
      lines.push(`- ${recapEventLine(e, roleName)}`);
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
