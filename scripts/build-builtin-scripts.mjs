#!/usr/bin/env node
/**
 * 内置官方三版剧本生成器（ADR-015）。
 * 从 src/data/official-roles.json 按 edition 筛选核心四阵营角色，
 * 产物只含 id + 事实字段——不含角色名/能力文案（版权线），解析时由 roleDb 注水补全。
 * 运行：npm run build:builtin（产物提交进仓库；官方更新角色数据后手动重跑）。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const roles = JSON.parse(readFileSync(join(root, 'src/data/official-roles.json'), 'utf-8'));

const EDITIONS = [
  { file: 'tb', edition: 'tb', name: '暗流涌动' },
  { file: 'bmr', edition: 'bmr', name: '黯月初升' },
  { file: 'snv', edition: 'snv', name: '梦殒春宵' },
];

const CORE_TEAMS = new Set(['townsfolk', 'outsider', 'minion', 'demon']);
const FACT_FIELDS = ['id', 'team', 'firstNight', 'otherNight', 'reminders', 'remindersGlobal', 'setup'];

const outDir = join(root, 'src/data/builtin-scripts');
mkdirSync(outDir, { recursive: true });

for (const ed of EDITIONS) {
  const entries = roles
    .filter((r) => r.edition === ed.edition && CORE_TEAMS.has(r.team))
    .map((r) => Object.fromEntries(FACT_FIELDS.filter((k) => r[k] !== undefined).map((k) => [k, r[k]])));
  if (entries.length === 0) throw new Error(`edition ${ed.edition} 筛不出任何角色，数据源异常`);
  const script = [{ id: '_meta', name: ed.name }, ...entries];
  writeFileSync(join(outDir, `${ed.file}.json`), JSON.stringify(script, null, 2) + '\n', 'utf-8');
  console.log(`${ed.name}（${ed.edition}）：${entries.length} 个角色`);
}
