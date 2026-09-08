# 项目状态（交接快照）

> 更新：2026-09-09 · **接手前必读本文 + 当前里程碑对应的 GitHub Issue（任务分解）**。

## 已完成

- M0 骨架：CI（tsc+vitest+build+docs-guard）、文档体系、类型、fixtures
- **数据层就绪**（`src/lib/`，纯函数）：
  - `scriptParser` 剧本宽松解析 + 角色注水（ADR-003/007）
  - `roleDb` 181 官方角色事实库（官方 botc-release 源，含实验角色，ADR-007；`pnpm run refresh:roledb` 刷新）
  - `setup` 抽袋默认构成 + setup 角色提示文案（ADR-008，不做自动计算）
  - `nightOrder` 夜晚行动顺序 + 系统锚点（ADR-006）
  - `vote` 计票 / `recap` 复盘 Markdown 导出
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
    （默认退役，可选编号入复用池）；M2/M3 菜单项置灰占位。
    阵营着色数据位 `Seat.alignment` 已就绪（good 蓝 / evil 红 / 未分配灰环）。
    配套：编号退役表 +「启用退役编号」批量入池（ADR-011 修订，`seatHighWater`
    只增不减；`addSeat` 优先消费池中最小号）。角色数据 refresh 保留官方
    reminder 文案字段（M2 夜单提示词来源）。
  - F-22 锚号原语已接入：换位 / 涟漪平移 / 增删座位 / 复用池（M1 已实现并测试）
  - F-10 i18n 初始化（zh-CN 默认 + en fallback）+ 移动优先样式
  - 测试 105 个全绿；`pnpm run ci`（tsc + vitest --coverage + build + docs 构建）通过；构建达标（N-01）
- **工程化**：pnpm（`pnpm-lock.yaml`，`packageManager`，esbuild build 放行）；vitest 覆盖率阈值
  （`vitest.config.ts`：lines 65 / funcs 70 / branches 75，CI 强制）；Dependabot（npm weekly + vitest 分组）；docs-guard
- 17 条已接受 ADR（编号 ADR-001 至 ADR-017，无跳号），24 项 F- 需求（编号 F-01 至 F-26，有跳号）

## 已知边界（M1）

- 内置三版角色名显示英文——中文显示名映射层是 v1.5 F-14（ADR-015 既定路线）
- 对局状态不落盘——F-07(a) 持久化属 M2，当前仅内存态
- URL 导入受 CORS 限制（raw.githubusercontent 等直链可用），失败引导粘贴/上传兜底
- 排座位页玩家卡：角色未分配（M1 全程），token 内芯空白、首夜/非首夜徽记、
  提示标记与阵营着色均待 M2 抽袋后生效；「入夜/白天」菜单项置灰即此原因

## 当前里程碑

**M2 入夜** = F-03 抽袋 + F-04 夜单 + F-06(a)(b) 流水 + F-07(a) 持久化。
验收：完整跑完首夜流程，杀后台可恢复。

- **任务分解（WIP）**：见 GitHub Issue「M2 入夜」(#5)——任务分解放在 Issue 而非本文件，
  避免并行分支同时改 STATUS 造成 merge 冲突。
- **已拍板决策**：ADR-017（持久化/事件/阶段机/夜单进度）+ ADR-006（夜单系统步骤）
  + ADR-008（抽袋只提示不自动算）+ ADR-011（锚号/seat 事件）。

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
- 别扩范围：M2 只做抽袋/夜晚顺序/事件流/持久化；白天计票是 M3 的事，别顺手实现。
- **Windows PowerShell 5.1 不能对含中文的 UTF-8 文件用 Get/Set-Content**（会写坏），编辑走工具/编辑器。
