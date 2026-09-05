/**
 * 开局逻辑：官方人数表、阵营构成、角色随机分配、恶魔伪装推荐。
 * 纯函数，不碰 UI 与持久化。
 */
import type { Role, Team } from '../types/script';
import type { TeamComposition } from '../types/game';

/** 官方阵营构成表（5–15 人），traveler 另算不进表 */
const COMPOSITION_TABLE: Record<number, TeamComposition> = {
  5: { townsfolk: 3, outsider: 0, minion: 1, demon: 1 },
  6: { townsfolk: 3, outsider: 1, minion: 1, demon: 1 },
  7: { townsfolk: 5, outsider: 0, minion: 1, demon: 1 },
  8: { townsfolk: 5, outsider: 1, minion: 1, demon: 1 },
  9: { townsfolk: 5, outsider: 2, minion: 1, demon: 1 },
  10: { townsfolk: 7, outsider: 0, minion: 2, demon: 1 },
  11: { townsfolk: 7, outsider: 1, minion: 2, demon: 1 },
  12: { townsfolk: 7, outsider: 2, minion: 2, demon: 1 },
  13: { townsfolk: 9, outsider: 0, minion: 3, demon: 1 },
  14: { townsfolk: 9, outsider: 1, minion: 3, demon: 1 },
  15: { townsfolk: 9, outsider: 2, minion: 3, demon: 1 },
};

export function baseComposition(playerCount: number): TeamComposition | null {
  return COMPOSITION_TABLE[playerCount] ?? null;
}

/** Baron 类 setup 调整：每有一个 Baron 类角色在场，+2 outsider -2 townsfolk */
export function adjustedComposition(playerCount: number, scriptRoles: Role[]): TeamComposition | null {
  const base = baseComposition(playerCount);
  if (!base) return null;
  const baronCount = scriptRoles.filter((r) => r.setup && r.id === 'baron').length;
  if (baronCount === 0) return base;
  return {
    ...base,
    townsfolk: base.townsfolk - 2 * baronCount,
    outsider: base.outsider + 2 * baronCount,
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * 从剧本角色池随机抽角分配。
 * 返回长度 = playerCount 的角色数组（按座位顺序）。
 * 角色池不足对应阵营时返回 null（调用层给中文错误）。
 */
export function assignRoles(
  scriptRoles: Role[],
  playerCount: number,
  rng: () => number = Math.random,
): Role[] | null {
  const comp = adjustedComposition(playerCount, scriptRoles);
  if (!comp) return null;

  const byTeam = (t: Team) => scriptRoles.filter((r) => r.team === t);
  const pick = (pool: Role[], n: number) => {
    const shuffled = shuffle(pool, rng);
    return shuffled.length >= n ? shuffled.slice(0, n) : null;
  };

  const demons = pick(byTeam('demon'), comp.demon);
  const minions = pick(byTeam('minion'), comp.minion);
  const outsiders = pick(byTeam('outsider'), comp.outsider);
  const townsfolk = pick(byTeam('townsfolk'), comp.townsfolk);
  if (!demons || !minions || !outsiders || !townsfolk) return null;

  return shuffle([...demons, ...minions, ...outsiders, ...townsfolk], rng);
}

/** 推荐恶魔伪装：不在场（未分配）的善良角色，取 3 个 */
export function recommendDemonBluffs(
  scriptRoles: Role[],
  assigned: Role[],
  rng: () => number = Math.random,
): Role[] {
  const assignedIds = new Set(assigned.map((r) => r.id));
  const goodNotInPlay = scriptRoles.filter(
    (r) => (r.team === 'townsfolk' || r.team === 'outsider') && !assignedIds.has(r.id),
  );
  return shuffle(goodNotInPlay, rng).slice(0, 3);
}
