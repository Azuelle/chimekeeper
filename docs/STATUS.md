# 项目状态（交接快照）

> 更新：2026-09-07 · **接手前必读此文件**。

## 已完成

- M0 骨架：CI（tsc+vitest+build+docs-guard）、文档体系、类型、fixtures
- **数据层全部就绪**（`src/lib/`，纯函数）：
  - `scriptParser` 剧本宽松解析 + 角色注水（ADR-003/007）
  - `roleDb` 181 官方角色事实库（官方 botc-release 源，含实验角色，ADR-007；`pnpm run refresh:roledb` 刷新）
  - `setup` 抽袋默认构成 + setup 角色提示文案（ADR-008，不做自动计算）
  - `nightOrder` 夜晚行动顺序 + 系统锚点（ADR-006）
  - `vote` 计票 / `recap` 复盘 Markdown 导出
  - `seats` 座位锚号原语：换位/增删/高水位/涟漪平移/复用池（ADR-011）
  - `ringLayout` 圆桌环几何纯函数：顶行铺满 + 等长 rail + 底行整行/收窄省行（ADR-005）
- **M1 开桌完成**（已合入 main，PR #1；分支 feat/m1-ui 可删）：
  - F-01 读剧本 UI：粘贴 / 上传 / URL 三入口 + 错误中文提示（F-01c）
    + 内置官方三版一键选择（ADR-015；生成器 `scripts/build-builtin-scripts.mjs`，
    产物 `src/data/builtin-scripts/`，pnpm run build:builtin 重生成）
  - F-01e 预览：角色按阵营分组、相克规则、问题面板（只展示 warning 级；info 级
    （角色注水/自定义字段透传）属 debug，设置面板出现前不进 UI）
  - F-02 排座位 UI v2（ADR-005 改写）：座位沿**圆桌环**顺时针连续相邻（顶行铺满、
    左右 rail 等长、底行整行或收窄一格省行；手机竖屏 2 列整行闭环省空间 / 桌面按
    容器宽 3–8 列自适应，`lib/ringLayout` 纯函数下发行列）；
     座位单元为**玩家卡**（自绘 token 圆环 + 名牌 + 右侧提示标记占位），
     整卡点击弹菜单（紧凑小字号、单色 icon）：菜单顶部**改名文本框**直改昵称，
     其下一行三图标 = 交换座位/平移座位（涟漪式）/移除座位
    （默认退役、可选编号入复用池）；M2/M3 菜单项置灰占位标注阶段。
    阵营着色数据位 `Seat.alignment` 已就绪（good 蓝 / evil 红 / 未分配灰环）。
    配套：编号退役表 + 「启用退役编号」批量入池（ADR-011 修订，seatHighWater
    只增不减；addSeat 优先消费池中最小号）。角色数据 refresh 顺带保留官方
    reminder 文案字段（M2 夜单提示词来源）。
  - F-10 i18n 初始化（zh-CN 默认 + en fallback）+ 移动优先样式
  - 测试 105 个全绿；`pnpm run ci`（tsc + vitest --coverage + build + docs 构建）通过；构建达标（N-01）
- **工程化**：pnpm（`pnpm-lock.yaml`，`packageManager: pnpm@10.26.1`，`onlyBuiltDependencies:[esbuild]`）；
  vitest 覆盖率阈值（`vitest.config.ts`：statements/lines 65、functions 70、branches 75，CI 强制）；
  Dependabot（npm weekly + vitest 全家分组）；CodeQL；docs-guard
- 16 条 ADR、26 项 F- 需求（v0.5 分层见 ADR-009）

## 已知边界（M1）

- 内置三版角色名显示英文——中文显示名映射层是 v1.5 F-14（ADR-015 既定路线）
- 对局状态不落盘——F-07(a) 持久化属 M2，当前仅内存态
- URL 导入受 CORS 限制（raw.githubusercontent 等直链可用），失败引导粘贴/上传兜底
- 排座位页玩家卡：角色未分配（M1 全程），token 内芯空白、首夜/非首夜徽记、
  提示标记与阵营着色均待 M2 抽袋后生效；「入夜/白天」菜单项置灰即此原因

## 下一步：M2 入夜（当前唯一任务）

**F-03 抽袋 + F-04 夜单 + F-06(a)(b) 流水 + F-07(a) 持久化。**
验收：完整跑完首夜流程，杀后台可恢复。

### 已拍板决策（勿重新讨论）
1. 首夜黎明终止态：`phase='day'`、`round=1`；day 面板 M3 占位。
2. 系统步骤事件：`minion_info`/`demon_info` **产生事件**（复用 `night_action`，
   payload `roleId='system:minion_info'|'system:demon_info'`，`seatNumbers`=爪牙们/恶魔，
   `info` 自由文本可选）；`dusk`/`dawn` **不产生事件**，只打勾进度。
3. 事件存**独立 `eventStore`**（`src/stores/events.ts`），不塞进 gameStore。
4. `seat_add`/`seat_remove`/`seat_swap` 事件 **M2 补接**（ADR-011 决定 #4）。
5. 持久化 = **单一当前局**（`loadCurrentGame()` 按 updatedAt 取最新）；多局列表 F-07b 属 M4。
6. 抽袋只提示 setup 调整、不自动算（ADR-008）；恶魔伪装默认 2 镇民 + 1 外来者。

### 推荐实现顺序（persistence 先行）
1. **类型 + DATA-MODEL**（type-first，同步 `docs/DATA-MODEL.md`）：
   - `Game.composition: TeamComposition`；`Game.nightProgress?: { round: number; checked: string[] }`。
   - `lib/setup.ts` 加 `alignmentForRole(role): 'good'|'evil'|undefined`
     （镇民/外来者→good，爪牙/恶魔→evil，其余 undefined；抽袋时赋给 `Seat.alignment`）。
   - `lib/events.ts`（新建，DATA-MODEL §3 引用但目前缺失）：`createEvent(game, type, seatNumbers, payload)`，
     id 用 `lib/id.ts` 的 `newId()`。
   - `lib/nightOrder.ts` 加 `stepKey(step)`：system→`system:${kind}`，role→`role:${roleId}`。
2. **persistence**：
   - `src/persistence/repo.ts`：`saveGame/loadCurrentGame/saveEvent/loadEvents/deleteGame/clearAll`（唯一 import `db`）。
   - devDep 加 `fake-indexeddb`；vitest setup `import 'fake-indexeddb/auto'`。
   - gameStore：每个变更 `set()` 后 `void saveGame(newGame)`；`hydrate()` 启动恢复 + `hydrated` 标志；
     `reset()` 同时 `deleteGame`。
   - `eventStore`：`log(game,type,seatNumbers,payload)` → 内存 append + saveEvent；`load(gameId)`/`clear()`。
   - App 挂载 `await hydrate()`（loading 态），按 `game.phase` 路由：`setup`→座位/抽袋，
     `firstNight|night`→夜单，`day`→M3 占位。
3. **F-03 抽袋** `components/setup/Drawing.tsx`：`baseComposition` + `setupRoleHints` 高亮 +
   手动 +/-（总数≠人数警告不阻止）→ `assignRoles` 写 `seat.roleId`+`alignment`+`composition`+`demonBluffs`；
   抽袋后玩家卡显示角色。
4. **F-04 夜单** `components/night/NightPanel.tsx`：`buildNightOrder(inPlayRoles, firstNight, playerCount)`
   逐项打勾；角色步骤显示 角色名 + 座位号(们) + reminder + `info` 自由文本；打勾→`log night_action`；
   进度写 `nightProgress`；`startFirstNight`/`endNight` 记 `phase_change`。
5. **F-06 流水**：补接 seat 事件；最小时间线视图（按 round+phase 分组，M3 再美化）。
6. **收尾**：新 ADR（ADR-017 持久化）、STATUS/PRD/DATA-MODEL 同步；分批 commit（docs → lib → store → UI）；`pnpm run ci`。

### 数据层已就绪（别重写，直接调）
`setup.ts`(baseComposition/setupRoleHints/assignRoles/recommendDemonBluffs)、
`nightOrder.ts`(buildNightOrder/buildRoleSteps/systemStepOverrideHints)、
`seats.ts`、`ringLayout.ts`、`scriptParser.ts`、`roleDb.ts`、`vote.ts`(M3)、`recap.ts`、`id.ts`；
`persistence/db.ts` Dexie schema v1（games/events）已就绪。
类型已就绪：`Seat.roleId/alignment/alive/hasVoteToken/reminderTokens/isTraveler`；
`Game.phase/round/demonBluffs/retiredSeatNumbers/reusePool`；`GamePhase`/`Alignment`（`types/game.ts` 导出）；`types/events.ts` 事件枚举。

## 红线（违反 = 打回）

- UI 术语必须与中文钟楼百科对齐（PRD §3 有对照表）
- 不自动计算 setup 调整——只提示 + 手动加减（ADR-008）
- `seatNumber` 编号不改变——移除默认**退役不复用**；仅当勾选「编号入复用池」或
  批量启用退役编号后，`addSeat` 才按池中最小号消费（ADR-011 修订；seatHighWater 只增不减）
- 座位操作全走 `lib/seats.ts` / `lib/ringLayout.ts`
- `src/lib/` 不许 import React（纯函数层）
- 现有测试不许破坏；新代码配测试；覆盖率阈值别下调（`vitest.config.ts`）
- 改 `src/types/` 或 `src/stores/` 必须同步 `docs/`（CI docs-guard 强制）
- 包管理器 = pnpm（别回退 npm / 别生成 package-lock.json）
- commit 前 `pnpm run ci` 全绿

## 给 opencode agent 的话

数据层**别重写，直接调用**——lib 的 JSDoc 和测试就是文档。
规则歧义先查 `docs/adr/` 和 `docs/reference/`（设置调整/认知覆盖/复盘实例都有蒸馏），
再不确定就在 PR 描述里留问题标签问用户，**不要替用户拍规则裁决**。
别扩范围：M2 只做抽袋/夜晚顺序/事件流/持久化；白天计票是 M3 的事，别顺手实现。

环境与提交约定：
- 用 pnpm；commit 信息 `feat|fix|docs|refactor|test|chore: 中文简述`，
  末尾 `Co-authored-by: DeepSeek V4 Flash <noreply@deepseek.com>`（AI 参与时）。
- **Windows PowerShell 5.1 不能对含中文的 UTF-8 文件用 Get/Set-Content**（会写坏），编辑走工具/编辑器。
- 本机 `git pull`（从 main 拉最新，新开 `feat/m2-night` 分支）→ `pnpm install`（如缺）→ `pnpm run ci` 先行确认基线绿。
