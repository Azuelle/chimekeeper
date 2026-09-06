#!/usr/bin/env node
/**
 * 角色事实库刷新器（ADR-007）。
 *
 * 主数据源 = 官方 script tool 仓库 ThePandemoniumInstitute/botc-release：
 *   - resources/data/roles.json    角色事实（id/名称/阵营/版次/能力/setup/提示标记）
 *   - resources/data/nightsheet.json  夜晚行动顺序（有序 id 数组，序号 = 数组下标+1）
 * 辅助源 = bra1n/townsquare src/roles.json，仅用于：
 *   - 图标外链 URL 映射（官方仓库不含逐角色图标资产）
 *   - 旧库中官方已下架角色的兜底 id 集合（如 mephit，历史剧本兼容）
 *
 * 版权边界（ADR-004）：仅蒸馏事实字段，名称/能力为官方文本随数据源引用，
 * 项目 MIT 仅覆盖代码；图标为运行时外链，不打包再分发。
 * 运行：npm run refresh:roledb（需网络；产出 src/data/official-roles.json）
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OFFICIAL = 'https://raw.githubusercontent.com/ThePandemoniumInstitute/botc-release/main';
const BRAIN = 'https://raw.githubusercontent.com/bra1n/townsquare/main';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, 'src/data/official-roles.json');

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`拉取失败 ${res.status}: ${url}`);
  return res.json();
}

const officialRoles = await fetchJson(`${OFFICIAL}/resources/data/roles.json`);
const nightsheet = await fetchJson(`${OFFICIAL}/resources/data/nightsheet.json`);
const brainRoles = await fetchJson(`${BRAIN}/src/roles.json`);

/** 夜单数组 → id 到序号的映射（不在单上 = 0 不行动） */
const firstNight = new Map(nightsheet.firstNight.map((id, i) => [id, i + 1]));
const otherNight = new Map(nightsheet.otherNight.map((id, i) => [id, i + 1]));

const brainIconIds = new Set(brainRoles.map((r) => r.id));

// 规范化：官方 traveller 拼写 → 项目 Team 类型；实验版次（carousel 等）→ 'custom'
const TEAM_FIX = { traveller: 'traveler' };
const CORE_EDITIONS = new Set(['tb', 'bmr', 'snv']);

const out = officialRoles.map((r) => {
  const entry = {
    id: r.id,
    name: r.name,
    edition: CORE_EDITIONS.has(r.edition) ? r.edition : 'custom',
    team: TEAM_FIX[r.team] ?? r.team,
    firstNight: firstNight.get(r.id) ?? 0,
    otherNight: otherNight.get(r.id) ?? 0,
    reminders: r.reminders ?? [],
    setup: Boolean(r.setup),
    ability: r.ability,
    // 官方 reminder 文案随数据源引用（ADR-004 边界同 ability），F-04 夜晚面板的提示词来源
    firstNightReminder: r.firstNightReminder,
    otherNightReminder: r.otherNightReminder,
  };
  if (brainIconIds.has(r.id)) {
    entry.image = `${BRAIN}/src/assets/icons/${r.id}.png`;
  }
  return entry;
});

// 兜底：保留旧库中官方已下架的角色（编号体系沿用旧值，仅历史剧本兼容）。
// 官方改名史（如 mephit → mezepheles，D&D 商标规避）：新名已在官方库中，
// 旧条目不再保留，等价查询由 roleDb 的 RENAMED_IDS 别名层处理。
const RENAMES = { mephit: 'mezepheles' };
const officialIds = new Set(out.map((r) => r.id));
const oldDb = JSON.parse(readFileSync(dbPath, 'utf-8'));
for (const old of oldDb) {
  if (officialIds.has(old.id) || officialIds.has(RENAMES[old.id])) continue;
  out.push(old);
  console.log(`保留官方已下架角色：${old.id}`);
}

// 完整性校验
const ids = new Set(out.map((r) => r.id));
if (ids.size !== out.length) throw new Error('角色 id 重复');
if (out.some((r) => !r.id || !r.name || !r.team)) throw new Error('存在缺必需字段的角色');
for (const team of new Set(out.map((r) => r.team))) {
  if (!['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric'].includes(team)) {
    throw new Error(`未知 team: ${team}`);
  }
}

writeFileSync(dbPath, JSON.stringify(out, null, 2) + '\n', 'utf-8');
console.log(
  `official-roles.json 已刷新：${out.length} 个角色` +
    `（夜单覆盖 first ${firstNight.size} / other ${otherNight.size}；图标链接 ${out.filter((r) => r.image).length}）`,
);
