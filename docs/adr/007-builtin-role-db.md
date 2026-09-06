# ADR-007: 内置官方角色数据库用于剧本 hydration

- 日期: 2026-09-06
- 状态: 已接受

## 背景

官方 script tool / botcscripts 生态的剧本 JSON 是 `_meta` + 纯角色 id 列表
（如 https://www.botcscripts.com/api/scripts/1426/json/ 的 "Outed Evil v4.5"），
不含名称、阵营、夜晚顺序。不注水就无法生成夜晚面板。

同时官方生态存在两种角色 id 写法（`fortuneteller` / `fortune_teller`，
`poppygrower` / `poppy_grower`），严格匹配会误报未知角色。

## 决定

1. 内置角色数据库 `src/data/official-roles.json`：来源为社区事实标准数据
   （bra1n/townsquare 的 roles.json + fabled.json，130 官方 + 13 传奇），
   仅蒸馏事实字段（team/firstNight/otherNight/reminders/setup/英文名），
   **删除英文夜晚提示词**，图标改为运行时外链——不打包再分发（ADR-004 版权红线）
2. `scriptParser` 的 hydration 规则：条目缺 team 时查内置库；name/夜晚顺序/
   reminders/setup 缺失时用内置库补全；**剧本自带数据优先**（如中文剧本的名字
   与提示词不被英文库覆盖）；每个被注水的角色记 info 级 warning
3. ID 规范化匹配：`normalizeRoleId` 去下划线/连字符、转小写，两种写法等价
4. 内置库找不到且条目无 team → 中文可读错误 `unknownRole`（含角色 id）
5. 内置库仅含官方角色（含传奇）；DIY 角色依赖剧本 JSON 自带完整数据（F-16 前提）

## 后果

- 正面：botcscripts/官方工具剧本直接可用；ID 写法差异不再报错；
  数据文件约 40KB、gzip 后 ~10KB，对 N-01 预算影响可忽略
- 负面：内置库会随官方新角色发布而过期，需定期从上游同步
  （记入维护清单）；名称为英文，中文显示名映射推迟到 F-14（剧本自带中文时无此问题）
