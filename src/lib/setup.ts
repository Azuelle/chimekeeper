/**
 * 开局逻辑：官方人数表、阵营构成、角色随机分配、恶魔伪装推荐。
 * 纯函数，不碰 UI 与持久化。
 */
import type { Role, Team } from '../types/script';
import type { Alignment, TeamComposition } from '../types/game';

/**
 * 角色阵营 → 实际阵营（M2 抽袋写 Seat.alignment 用）。
 * traveler / fabled / loric 不进盲抽袋，返回 null（M4 旅行者阶段说书人手动指定）。
 */
export function alignmentForRole(team: Team): Alignment | null {
  if (team === 'minion' || team === 'demon') return 'evil';
  if (team === 'townsfolk' || team === 'outsider') return 'good';
  return null;
}

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

/**
 * 在场 setup 角色的调整方向提示（ADR-008）：不自动改构成，仅供 UI 高亮文案。
 * 文案蒸馏自中文钟楼百科【设置调整】页；未知 setup 角色（DIY）给通用提示。
 */
const SETUP_HINTS: Record<string, string> = {
  baron: '+2外来者 -2镇民',
  godfather: '+1或-1外来者，调整相应镇民',
  fanggu: '+1外来者 -1镇民',
  zombuul: '-1外来者 +1镇民',
  balloonist: '+0~1外来者，调整相应镇民',
  heretic: '+0外来者（每有一名玩家死亡，多一人获胜）',
  hermit: '-0~1外来者 +对应镇民（说书人决定）',
  summoner: '-1恶魔 +1镇民',
  xaan: '加减任意数量外来者，调整相应镇民',
  maligner: '+1爪牙（自身不出场）',
  kazali: '移除所有爪牙，调整外来者，补镇民至人数',
  lordoftyphon: '移除所有爪牙，调整外来者，补镇民至人数',
  senti: '+1或-1外来者或不变（传奇）',
  drunk: '-1酒鬼 +1镇民（认知覆盖）',
  lunatic: '认知覆盖：以为的恶魔（构成不变）',
  marionette: '移除自身 +1镇民，抽取后标记（认知覆盖）',
  vortox: '（特殊）全镇民获得错误信息',
  atheist: '（特殊）移除所有邪恶角色，说书人自由设置',
  legion: '（特殊）过半角色标记替换为军团',
  politically: '',
};
delete SETUP_HINTS['politically'];

export interface SetupHint {
  roleId: string;
  roleName: string;
  /** 调整方向一句话；内置表没有的 setup 角色给通用提示 */
  hint: string;
}

export const GENERIC_SETUP_HINT = '该角色会调整初始设置，请按其能力说明调整构成';

export function setupRoleHints(scriptRoles: Role[]): SetupHint[] {
  return scriptRoles
    .filter((r) => r.setup)
    .map((r) => ({
      roleId: r.id,
      roleName: r.name,
      hint: SETUP_HINTS[r.id] ?? GENERIC_SETUP_HINT,
    }));
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
/**
 * 从剧本角色池按【说书人确认后的构成】随机抽角（ADR-008：构成由手动加减得出，
 * 不再自动计算 setup 调整）。
 */
export function assignRoles(
  scriptRoles: Role[],
  composition: TeamComposition,
  rng: () => number = Math.random,
): Role[] | null {
  const comp = composition;
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

/** 不在场且属善良阵营的角色（恶魔伪装推荐与抽袋页伪装下拉共用同一谓词，防两者漂移） */
export function goodRolesNotInPlay(scriptRoles: Role[], inPlayIds: ReadonlySet<string>): Role[] {
  return scriptRoles.filter(
    (r) => (r.team === 'townsfolk' || r.team === 'outsider') && !inPlayIds.has(r.id),
  );
}

/**
 * 推荐恶魔伪装（F-03e）：默认策略 2 镇民 + 1 外来者（PRD）。
 * 对应池不足时从另一善良阵营补足；善良角色合计不足 3 个时返回实际可得数量
 * （调用层按 <3 提示）。
 */
export function recommendDemonBluffs(
  scriptRoles: Role[],
  assigned: Role[],
  rng: () => number = Math.random,
): Role[] {
  const assignedIds = new Set(assigned.map((r) => r.id));
  const good = goodRolesNotInPlay(scriptRoles, assignedIds);
  const pool = (team: Team) => shuffle(good.filter((r) => r.team === team), rng);
  const townsfolk = pool('townsfolk');
  const outsiders = pool('outsider');
  return [...townsfolk.slice(0, 2), ...outsiders.slice(0, 1), ...townsfolk.slice(2), ...outsiders.slice(1)].slice(0, 3);
}
