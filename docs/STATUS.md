# 项目状态（交接快照）

> 更新：2026-09-11 · **接手前必读本文 + 当前里程碑对应的 GitHub Issue（任务分解）**。
> WIP 任务分解只放 Issue（避免并行分支改同一文件冲突）；本文只放稳定事实。

## 已完成

- M0 骨架：CI（tsc+vitest+build+docs-guard）、文档体系、类型、fixtures
- **数据层就绪**（`src/lib/`，纯函数）：
  - `scriptParser` 剧本宽松解析 + 角色注水（ADR-003/007）
  - `roleDb` 181 官方角色事实库（官方 botc-release 源，含实验角色，ADR-007；`pnpm run refresh:roledb` 刷新）
  - `setup` 抽袋默认构成 + setup 角色提示文案（ADR-008，不做自动计算）
  - `nightOrder` 夜晚行动顺序 + 系统锚点（ADR-006）
  - `vote` 计票 / `recap` 复盘 Markdown 导出（F-05 / F-08）
  - `events` 事件辅助（隐藏类型折叠、生死状态回写）/ `roleMap` 角色查询薄封装（M3）
  - `seats` 座位锚号原语：换位/增删/高水位/涟漪平移/复用池（ADR-011）
  - `ringLayout` 圆桌环几何纯函数：顶行铺满 + 等长 rail + 底行整行/收窄省行（ADR-005）
- **M1 开桌完成**（已合入 main，PR #1）：
  - F-01 读剧本 UI：粘贴 / 上传 / URL 三入口 + 错误中文提示（F-01c）
    + 内置官方三版一键选择（ADR-015；生成器 `scripts/build-builtin-scripts.mjs`，
    产物 `src/data/builtin-scripts/`，`pnpm run build:builtin` 重生成）
  - F-01e 预览：角色按阵营分组、相克规则、问题面板（只展示 warning 级；info 级
    （角色注水/自定义字段透传）属 debug，设置面板出现前不进 UI）
  - F-02 排座位 UI v2（ADR-005 改写）：座位沿**圆桌环**顺时针连续相邻（顶行铺满、
    左右 rail 等长、底行整行或收窄一格省行；手机竖屏 2 列整行闭环省空间 / 桌面按
    容器宽 3–8 列自适应，`lib/ringLayout` 纯函数下发行列）。
    座位单元为**玩家卡**（自绘 token 圆环 + 名牌 + 右侧提示标记占位），
    整卡点击弹菜单：顶部改名文本框直改昵称，下方三图标 = 交换座位 / 涟漪平移 / 移除座位
    （默认退役，可选编号入复用池）；角色类 / 白天类菜单项置灰占位（M4 解锁）。
    阵营着色数据位 `Seat.alignment` 已就绪（good 蓝 / evil 红 / 未分配灰环）。
    配套：编号退役表 +「启用退役编号」批量入池（ADR-011 修订，`seatHighWater`
    只增不减；`addSeat` 优先消费池中最小号）。角色数据 refresh 保留官方
    reminder 文案字段（夜单提示词来源）。
  - F-22 锚号原语已接入：换位 / 涟漪平移 / 增删座位 / 复用池（M1 已实现并测试）
  - F-10 i18n 初始化（zh-CN 默认 + en fallback）+ 移动优先样式
- **M2 入夜完成**（已合入 main，PR #13；Issue #5 已关闭）：
  - F-07(a) 持久化（ADR-017）：`persistence/repo.ts`（saveGame/loadCurrentGame 单一当前局/
    saveEvent/deleteEvent/loadEvents/deleteGame 级联/clearAll，无 IDB 环境静默跳过）；
    gameStore 全 action 写通双写 + `hydrate()` 启动恢复 + reset 删库级联；
    独立 `stores/events.ts`；恢复后从 `game.scriptSnapshot` 重建剧本状态
  - F-03 抽袋 `components/setup/Drawing.tsx`：官方默认构成 + setup 角色调整提示高亮
    （ADR-008 只提示不自动算）+ 手动 +/-（总数不符醒目警告不阻止）+ 随机分配 +
    手动换角下拉 + 恶魔伪装（默认 2 镇民 + 1 外来者，`recommendDemonBluffs`）+ 入夜确认
  - F-04 夜单 `components/night/NightPanel.tsx`：系统锚点（黄昏/爪牙信息/恶魔信息/黎明，
    ≥7 人才含信息步骤）+ 角色步骤清单（官方 reminder 提示词）+ 逐项打勾进
    `nightProgress`（stepKey 持久化）+ info 自由文本；角色/信息步骤记 `night_action`
    事件（`system:*` 复用，取消勾选删事件）；勾「黎明」自动进白天（round+1）
  - F-06(a)(b) 流水：座位操作记 seat_* 事件（setup 阶段摆桌不记；涟漪带 ripple 标记）；
    `components/Timeline.tsx` 按 round+phase 分组时间线（system:* 特判显示爪牙/恶魔信息）
  - 阶段回退：NightPanel / DayPanel 提供「返回上一阶段」；`rewindPhase` 还原阶段/round，
    删除对应 phase_change 事件，并从 night_action 事件恢复夜单进度（回退到夜时补回
    dusk/dawn 打勾）
  - 阶段机：setup → firstNight(0) → day(1) ⇄ night(1) → day(2)…（round=已完成夜数），
    各跳转记 phase_change 事件；App 按 `game.phase` 路由（ADR-017 #4）
- **M3 天亮完成 = v0.5 内测**（已合入 main，PR #16；实测反馈 Issue #17，fixes 已合 PR #19）：
  - F-05 计票 `components/day/DayPanel.tsx`：提名 / 投票（票数可选，`lib/vote.votesNeeded`
    算过半阈值）/ 处决（存活或死亡）/ 死亡登记（cause=night/execution/other）/ 复活 /
    切换投票权 / 自由备注 / 登记结局；ended 阶段显示结局
  - F-06(c)(d) 流水修正：`note` 可编辑；用户事件（note/提名/投票/处决/死亡/复活）可删除
    + 5 秒撤销（death/revival 删除后经 `reconcileLifeState` 回写座位 alive）；
    `night_action` 的 info 自由文本可编辑；`phase_change` 折叠；空 section 提示
  - F-07(b) 首页 `components/home/Home.tsx` + `repo.listGames/loadGame`：历史对局列表、
    继续/删除/继续最近对局；App 无对局时渲染 Home
  - F-08 战报 `components/recap/RecapExport.tsx`：`generateRecap` → Markdown 复制
    （剪贴板，非 HTTPS 降级 `execCommand`）/ 下载 .md
  - M3 实测修正（PR #19）：死亡玩家魔典灰化 + ☠️ 帷幕；事件编辑改原地替换（不再
    remove+append，修复时间线与复盘错序）；时间线空态 / 无「处决」建议
- **角色图标接入**（ADR-018，PR #20）：botc-icons 单色剪影**运行时外链** +
  CSS `mask` 着色（实际阵营优先、回落角色队伍色，善良 Imp 渲成蓝色）；座位 token
  剪影居中 + **弧形角色名**（SVG textPath，类 clocktower.online），剧本预览 / 夜单 /
  时间线 / 抽袋结果同步接入；取不到图标回落纯文本（不影响主流程）
- **工程化**：pnpm（`pnpm-lock.yaml`，`packageManager`，esbuild build 放行）；vitest 覆盖率
  阈值（`vitest.config.ts`：statements/lines/functions 90、branches 85，CI 强制）；
  Dependabot（npm weekly + vitest 分组）；docs-guard（PR 内改 types/stores 必须同步 docs）
- 18 条已接受 ADR（ADR-001 至 ADR-018，无跳号），26 项 F- 需求（F-01 至 F-26，连续编号）
- 测试 222 个全绿（28 个文件）；覆盖率 statements 96.5 / branches 86.3 / functions 92.7 /
  lines 96.5；`pnpm run ci`（tsc + vitest --coverage + build + docs 构建）通过

## 已知边界

- 菜单角色类操作（指定/更换角色、设置阵营、记录夜晚行动、挂提示标记）与白天类
  （标记死亡/投票权/提名）仍是置灰占位——M4 #23 解锁（ADR-005 门控）
- 提示标记（reminder token）字段与展示已就绪，但无挂接 UI（`addReminder` 锁定，M4 #23）
- F-17 旅行者/传奇/奇遇：`Seat.isTraveler` 已预留但零消费，建模待 ADR-019（M4 #24）
- M3 实测 features 未落（Issue #17 只合了 fixes，遗留归 #22 先清）：待处决两步、
  「恶魔的伪装」常驻面板 + 卡牌式展示、夜晚登记死亡、F-07(b) 只读查看
- ADR-017 文档漂移：仍写「多局列表属 M4」，实际 M3 已 ship——随 #22 一并改措辞
- 内置三版角色名显示英文——中文显示名映射层是 v1.5 F-14（ADR-015 既定路线）
- URL 导入受 CORS 限制（raw.githubusercontent 等直链可用），失败引导粘贴/上传兜底
- 图标运行时外链 botc-icons，离线/弱网回落纯文本（PWA 未做，M4 #28）
- `components/DayPlaceholder.tsx` 已是死代码（M3 由 DayPanel 取代），仅其自身测试引用

## 当前里程碑

**M4 补全 = v1 完整版**（umbrella Issue #21）。
v0.5 内测已完成（M3 合入 main）；#17 实测反馈的 fixes 已落（PR #19），
features 遗留归 M4 第一批 #22；其余按 #23–#29。

- **任务分解**：M4 #21；子单 #22（v0.5 反馈遗留）→ #23（菜单角色操作/提示标记）→
  #24（F-17，含 ADR-019）→ #25 F-19 / #26 F-20 / #27 F-21 → #28 F-09 / #29 F-10。
- **先拍板再写码**：ADR-019（F-17：传奇/奇遇如何入魔典、旅行者阵营/票数门槛/存活数
  排除口径），见 #24。
- **已拍板决策**：ADR-017（持久化/事件/阶段机/夜单进度）+ ADR-018（角色图标）
  + ADR-005（玩家卡/菜单门控）+ ADR-006（夜单系统步骤）+ ADR-008（抽袋只提示）
  + ADR-011（锚号/seat 事件）。

## 红线（违反 = 打回）

- UI 术语必须与中文钟楼百科对齐（PRD §3 有对照表）
- 不自动计算 setup 调整——只提示 + 手动加减（ADR-008）
- `seatNumber` 编号不改变——移除默认**退役不复用**；仅当勾选「编号入复用池」或
  批量启用退役编号后，`addSeat` 才按池中最小号消费（ADR-011 修订；`seatHighWater` 只增不减）
- 座位操作全走 `lib/seats.ts` / `lib/ringLayout.ts`
- `src/lib/` 不许 import React（纯函数层）
- 现有测试不许破坏；新代码配测试；覆盖率阈值别下调（`vitest.config.ts`）
- 改 `src/types/` 或 `src/stores/` 必须同步 `docs/`（CI docs-guard 强制）
- 包管理器 = pnpm（别回退 npm / 别生成 package-lock.json）
- commit 规范与 co-author 见 AGENTS.md；commit 前 `pnpm run ci` 全绿

## 给 opencode agent 的话

- **接手流程**：`git pull`（main）→ 读本文 + 当前里程碑 Issue（任务分解）+ 相关 ADR → `pnpm install`（如需）→ `pnpm run ci` 先确认基线绿 → 新开 `feat/*` 分支开工。
- 数据层**别重写，直接调用**——lib 的 JSDoc 和测试就是文档。
- 规则歧义先查 `docs/adr/` 和 `docs/reference/`，再不确定就在 PR 描述留问题问用户，**不要替用户拍规则裁决**。
- 别扩范围：当前 M4 只做 #21 分解内的项；v1.5/v2（F-11 自由魔典 / F-12 长图 /
  F-13 教学 / F-14 书架 / F-25 全角色池 / F-15 战绩 / F-16 捏角色 / F-18 工具箱）
  不进 M4，别顺手做。
- **Windows PowerShell 5.1 不能对含中文的 UTF-8 文件用 Get/Set-Content**（会写坏），编辑走工具/编辑器。
