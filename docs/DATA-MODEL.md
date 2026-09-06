# DATA-MODEL — 数据模型（唯一真相源）

> ⚠ 本文件与 `src/types/` 保持同步。**修改 `src/types/` 前必须先更新本文件**（AGENTS.md 规则，CI docs-guard 强制检查）。
> 类型定义的权威可编译版本在 `src/types/`，本文件负责解释语义、约束与理由。

## 1. 剧本（Script）— `src/types/script.ts`

剧本 JSON 遵循 bra1n/townsquare 格式（社区事实标准），解析层宽松兼容（ADR-003）。

```
Script JSON = [ ScriptMeta?, (Role | ScriptJinxes)... ]
```

- **ScriptMeta**：`id: "_meta"`，含 name/author；国内工具的 logo、almanac、bootlegger 等自定义字段透传并记 warning
- **Role**：核心字段 `id / name / team / firstNight / otherNight`；`firstNightReminder / otherNightReminder` 是夜晚面板（F-04）的提示词来源；`reminders` 是提示 token 的来源；`setup: true` 标记影响阵营构成的角色（如 Baron）
- **ScriptJinxes**：`id: "jinx"` 的相克规则列表
- 解析产物 `Script` = 规范化 roles + jinxes + **warnings**（导入时展示给说书人）

## 2. 对局（Game）— `src/types/game.ts`

- **Seat.seatNumber 是全场主键**：复盘事件、玩家统计全部以编号为锚（国内编号文化，核心设计决策）
- **ADR-011 锚号不变量**：seatNumber = 椅子锚点，只增不改，移除默认退役；displayOrder = 物理位置独立字段；换位 = 原子交换住户字段（昵称/角色/生死/票token/提示标记），编号与位置不动——女舍监与 1 2 3 4 15 5 6 式排列免费支持，历史事件永不失效。原语见 `src/lib/seats.ts`
- **Seat.alignment?: 'good' | 'evil'**（ADR-005 玩家卡）：玩家**实际阵营**，与角色
  阵营解耦——邪恶/善良旅行者、麻脸巫婆制造的善良恶魔等场景由说书人手动改；
  undefined = 角色未分配（M1 全程 / M2 抽袋前）。token 着色以此为准
- **平移座位（涟漪）**：`rippleShift(seats, from, to)` = 链式 `swapOccupants`，
  选中住户逐位向目标交换，其余住户顺延（ABCD 选 A 移到 4 号位 → BCDA）；
  seatNumber 与 displayOrder 均不动，玩家换椅子、椅子不动
- **编号复用池（ADR-011 修订，2026-09-07）**：默认退役不复用不变；
  移除座位时说书人可勾选「编号入复用池」（默认不勾），退役编号可经
  「启用全部退役编号」按钮批量入池；`addSeat` 优先消费池中**最小号**，池空才走
  高水位 max+1。`Game.retiredSeatNumbers: number[]`（已退役未启用）、
  `Game.reusePool: number[]`（待复用）。高水位依旧只增不减
- 玩家昵称可选——纯编号局是合法状态
- **scriptSnapshot 存完整剧本快照**而非引用：剧本之后被删改不影响历史对局复盘
- phase 状态机：`setup → firstNight → (day ⇄ night)* → ended`；round 从首夜 0 开始计
- demonBluffs：3 个不在场善良角色 id
- `Seat.isTraveler?: boolean`（v0.5 预留，ADR-009）：旅行者座位；阵营计算（共情者邻座
  邪恶计数、存活人数、票数门槛）均排除旅行者；死后阵营转邪由说书人手动标记

## 3. 事件日志（Event Log）— `src/types/events.ts`

复盘与统计的地基。**事件类型是封闭枚举，新增类型需要 ADR**。

| 类型 | 何时产生 | 关键 payload |
|---|---|---|
| `night_action` | 夜晚面板打勾某角色行动 | roleId, info? |
| `death` | 夜晚结算/任意时间死亡登记 | cause?, announced |
| `nomination` | 白天提名 | nominatorSeat, nominatedSeat |
| `vote` | 投票计票 | votesFor, votesNeeded, passed |
| `execution` | 处决 | died（弄臣等 false） |
| `revival` | 复活（教授等） | — |
| `role_change` | 角色变化（哲学家/pit-hag） | fromRoleId, toRoleId |
| `note` | 说书人自由备注（含 F-19 备忘填空结果） | text |
| `claim` | 玩家声称的角色/信息/能力（F-20） | claimRoleId?, text |
| `phase_change` | 阶段切换（自动） | — |
| `game_end` | 结局登记 | winningTeam, reason? |

设计约束：
- 每条事件携带 `round + phase`，时间线由事件流直接渲染，无需额外状态
- `seatNumbers: number[]` 引用涉及座位
- 事件可删除/修正，但**不做事件溯源（event sourcing）**——v1 保留简单性，Game 状态与事件流双写，一致性由 store 层保证
- **v2 玩家统计（F-15）的兼容性承诺**：事件粒度足以支撑"某玩家拿过哪些角色/胜率/同队关系"的聚合，座位编号与角色 id 不可从 payload 中移除

## 4. 夜晚面板步骤（NightStep）— ADR-006

夜晚面板 = 系统锚点步骤 + 角色步骤的合并清单。

- **系统步骤**（内置，不来自剧本数据）：`dusk`（黄昏）/ `minion_info`（首夜爪牙信息，≥7 人）/ `demon_info`（首夜恶魔信息，≥7 人）/ `dawn`（黎明）
- **角色步骤**：按在场角色的 firstNight/otherNight 排序（`nightOrder.ts`）
- 顺序：首夜 = dusk → minion_info → demon_info → 角色 → dawn；其他夜晚 = dusk → 角色 → dawn
- 角色改写系统步骤（罂粟种植者/魔术师等）：v1 仅展示提示文案，不自动改写
- 中文百科调整版夜晚顺序为 v2 候选数据源（docs/reference/night-order-cn.md）

## 5. 持久化 schema（Dexie / IndexedDB）

- 表 `games`：Game 对象，主键 id，索引 updatedAt
- 表 `events`：GameEvent，主键 id，索引 [gameId+round]
- 表 `scripts`：收藏/历史的剧本（v1.5 F-14 启用，v1 仅当前对局快照）
- 版本迁移走 Dexie `version(n).stores()`，schema 变更须在本文件登记

## 6. 明确不建模的东西

- 不建模"规则判定结果"（Won't：不做自动裁决）
- 不建模玩家账号（local-first 红线）
- v1 不建模 token 的自由坐标（v1.5 F-11 引入，届时 Seat/ReminderToken 增加可选坐标字段，向后兼容）
