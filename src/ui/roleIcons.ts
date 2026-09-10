/**
 * 角色图标 URL（ADR-018 / ADR-004 素材红线）。
 *
 * 图标来源 = tomozbot/botc-icons（400×400 单色剪影 SVG），仅**运行时外链**，
 * 不打包进仓库再分发（与 bra1n 角色图标同口径）。取不到时组件回落纯文本。
 *
 * 单色剪影是 recolor 的前提：颜色不取自素材自身，而由 `tokenSkin` 用 CSS mask
 * 赋色（阵营优先 / 队伍回落），因此同一张红色 Imp 剪影可以渲成蓝色。
 */
import { normalizeRoleId } from '../lib/roleDb';
import type { Team } from '../types/script';

/** 集中一处，方便日后换源/钉版本（可改为具体 commit SHA 更稳） */
const ICON_BASE = 'https://raw.githubusercontent.com/tomozbot/botc-icons/main/SVG';

/**
 * botc-icons 现有文件名（已去 `.svg`）。用于区分"精确命中"与"回落通用图标"，
 * 避免为库里没有的角色拼出 404 外链。新增角色时随 refresh 脚本核对。
 */
const KNOWN_ICONS = new Set<string>([
  'acrobat', 'alchemist', 'alhadikhia', 'alsaahir', 'amnesiac', 'angel', 'apprentice', 'artist',
  'assassin', 'atheist', 'balloonist', 'banshee', 'barber', 'barista', 'baron', 'beggar', 'bigwig',
  'bishop', 'boffin', 'bonecollector', 'boomdandy', 'bootlegger', 'bountyhunter', 'buddhist',
  'bureaucrat', 'butcher', 'butler', 'cacklejack', 'cannibal', 'cerenovus', 'chambermaid', 'chef',
  'choirboy', 'clockmaker', 'courtier', 'cultleader', 'custom', 'damsel', 'deusexfiasco', 'deviant',
  'devilsadvocate', 'djinn', 'doomsayer', 'dreamer', 'drunk', 'duchess', 'empath', 'engineer',
  'eviltwin', 'exorcist', 'fanggu', 'farmer', 'fearmonger', 'ferryman', 'fibbin', 'fiddler',
  'fisherman', 'flowergirl', 'fool', 'fortuneteller', 'gambler', 'gangster', 'gardener', 'general',
  'gnome', 'goblin', 'godfather', 'godofug', 'golem', 'goon', 'gossip', 'grandmother', 'gunslinger',
  'harlot', 'harpy', 'hatter', 'hellslibrarian', 'heretic', 'hermit', 'highpriestess', 'hindu',
  'huntsman', 'imp', 'innkeeper', 'investigator', 'judge', 'juggler', 'kazali', 'king', 'klutz',
  'knaves', 'knight', 'legion', 'leviathan', 'librarian', 'lilmonsta', 'lleech', 'lordoftyphon',
  'lunatic', 'lycanthrope', 'magician', 'marionette', 'mastermind', 'mathematician', 'matron',
  'mayor', 'mezepheles', 'minstrel', 'monk', 'moonchild', 'mutant', 'nightwatchman', 'noble',
  'nodashii', 'ogre', 'ojo', 'oracle', 'organgrinder', 'pacifist', 'philosopher', 'pithag', 'pixie',
  'plaguedoctor', 'po', 'poisoner', 'politician', 'pope', 'poppygrower', 'preacher', 'princess',
  'professor', 'psychopath', 'pukka', 'puzzlemaster', 'ravenkeeper', 'recluse', 'revolutionary',
  'riot', 'sage', 'sailor', 'saint', 'savant', 'scapegoat', 'scarletwoman', 'seamstress', 'sentinel',
  'shabaloth', 'shugenja', 'slayer', 'snakecharmer', 'snitch', 'soldier', 'spiritofivory', 'spy',
  'steward', 'stormcatcher', 'summoner', 'sweetheart', 'tealady', 'thief', 'tinker', 'tor',
  'towncrier', 'toymaker', 'undertaker', 'ventriloquist', 'vigormortis', 'villageidiot', 'virgin',
  'vizier', 'vortox', 'voudon', 'washerwoman', 'widow', 'witch', 'wizard', 'wraith', 'xaan',
  'yaggababble', 'zealot', 'zenomancer', 'zombuul',
]);

/** 队伍通用兜底剪影（库里一定有） */
const TEAM_FALLBACK: Record<Team, string> = {
  townsfolk: 'townsfolk',
  outsider: 'outsider',
  minion: 'minion',
  demon: 'demon',
  traveler: 'traveller',
  fabled: 'fabled',
  loric: 'loric',
};

function iconFile(name: string): string {
  return `${ICON_BASE}/${name}.svg`;
}

/** 角色 id 是否有专属剪影 */
export function hasRoleIcon(roleId: string): boolean {
  return KNOWN_ICONS.has(normalizeRoleId(roleId));
}

/**
 * 角色图标 URL：优先专属剪影，缺失回落到队伍通用图标；
 * 无队伍信息且非已知角色时返回 `undefined`（组件不渲染图标）。
 */
export function roleIconUrl(roleId: string | undefined, team?: Team): string | undefined {
  if (roleId) {
    const norm = normalizeRoleId(roleId);
    if (KNOWN_ICONS.has(norm)) return iconFile(norm);
  }
  if (team) return iconFile(TEAM_FALLBACK[team]);
  return undefined;
}
