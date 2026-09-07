# ADR-017（持久化）: 单一当前局 + 写通双写 + 独立事件 store，M2 首夜状态机

- 日期: 2026-09-07
- 状态: 已接受
- 关联: F-07(a)、F-03、F-04、F-06；ADR-011（锚号/事件）、ADR-006（夜单系统步骤）

## 背景

M2 引入对局状态持久化（F-07a，杀后台可恢复）与夜晚流程（F-03/F-04），需要先定：
对局怎么落盘、事件放哪、首夜跑完后阶段机停在哪、夜单打勾进度如何恢复。

## 决定

1. **单一当前局（v1）**：`loadCurrentGame()` 按 `updatedAt` 取最新一条；多局列表
   /只读历史是 M4 F-07b 的事。schema 已含 `updatedAt` 索引，无需迁移。
2. **写通双写（write-through）**：gameStore 每次变更 `set()` 后 `void saveGame(newGame)`
   （fire-and-forget）；不引入事件溯源，保持 v1 简单。一致性由 store 层保证
   （DATA-MODEL §3 同款约定）。
3. **事件独立 store**（`src/stores/events.ts`）：`GameEvent[]` 内存态 + `saveEvent` 写通；
   不塞进 gameStore。复盘/时间线/统计（F-08/F-15）直接消费它，职责清晰。
4. **阶段机与恢复路由**：首夜黎明后 `phase='day'`、`round=1`（白天面板属 M3 占位）；
   启动 `hydrate()` 后按 `game.phase` 路由——`setup`→座位/抽袋，`firstNight|night`→夜单，
   `day`→M3 占位。保证任意时刻杀后台都能回到正确界面。
5. **夜单进度持久化**：`Game.nightProgress?: { round: number; checked: string[] }`，
   `checked` 存步骤 key（`nightOrder.stepKey()`：system→`system:${kind}`、role→`role:${roleId}`）。
6. **事件 id**：`lib/id.ts` 的 `newId()`（crypto.randomUUID → getRandomValues → Math.random 兜底）。

## 后果

- 正面：接受条件"跑完首夜杀后台可恢复"直接成立；事件与对局分表分 store，扩展面清晰。
- 负面：双写存在极端情况下不一致的窗口（进程被杀在 set 与 put 之间）；v1 接受
  （local-first 小数据量，put 极快），后续如需可在 v2 引入写入队列/去抖。

## 补充：系统步骤的事件策略（ADR-006 细化，2026-09-07）

- `minion_info`（爪牙信息）/ `demon_info`（恶魔信息）**产生事件**：复用 `night_action`，
  `payload.roleId = 'system:minion_info' | 'system:demon_info'`，`seatNumbers` 分别为
  爪牙座位 / 恶魔座位，`info` 自由文本可选。
- `dusk`（黄昏）/ `dawn`（黎明）**不产生事件**，仅夜单 checklist 打勾（进度持久化）。
- 不新增事件枚举类型：时间线渲染对 `system:*` 前缀特判显示「爪牙信息 / 恶魔信息」。
