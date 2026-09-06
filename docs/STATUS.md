# 项目状态（交接快照）

> 更新：2026-09-06 · 由 OWUI 侧维护。**opencode 接手前必读此文件**。

## 已完成

- M0 骨架：CI（tsc+vitest+build+docs-guard）、文档体系、类型、fixtures
- **数据层全部就绪**（`src/lib/`，纯函数，38 测试全绿）：
  - `scriptParser` 剧本宽松解析 + 角色注水（ADR-003/007）
  - `roleDb` 143 官方角色事实库（ADR-007）
  - `setup` 抽袋默认构成 + setup 角色提示文案（ADR-008，不做自动计算）
  - `nightOrder` 夜晚行动顺序 + 系统锚点（ADR-006）
  - `vote` 计票 / `recap` 复盘 Markdown 导出
  - `seats` 座位锚号原语：换位/增删/高水位（ADR-011）
- 16 条 ADR、26 项 F- 需求（v0.5 分层见 ADR-009）

## 下一步：M1 开桌（当前唯一任务）

**F-01 读剧本 UI + F-02 排座位 UI。**
验收：手机浏览器导入 `fixtures/official-tool-tb-sample.json` → 看到角色列表 → 排 7 人座位（可填昵称）。

任务分解（建议顺序）：

1. `stores/script.ts`：加载/解析/选择剧本（内置三版先留占位）
2. `components/ScriptImport`：粘贴 JSON / 上传文件 → 解析错误展示 → 角色列表预览
3. `stores/game.ts`：创建对局 + 座位 CRUD（**必须走 `lib/seats.ts` 原语**）
4. `components/SeatGrid`：响应式网格（ADR-005），昵称输入，按 `displayOrder` 排序
5. i18n 文案：术语对照表见 PRD §3（"夜晚行动顺序"等，**禁自造词**）

## 红线（违反 = 打回）

- UI 术语必须与中文钟楼百科对齐（PRD §3 有对照表）
- 不自动计算 setup 调整——只提示 + 手动加减（ADR-008）
- `seatNumber` 不可变/不复用（ADR-011），座位操作全走 `lib/seats.ts`
- `src/lib/` 不许 import React（纯函数层）
- 现有 38 个测试不许破坏；新代码配测试
- commit 前 `npm run ci` 全绿

## 给 opencode agent 的话

数据层**别重写，直接调用**——lib 的 JSDoc 和测试就是文档。
规则歧义先查 `docs/adr/` 和 `docs/reference/`（设置调整/认知覆盖/复盘实例都有蒸馏），
再不确定就在 PR 描述里留问题标签问用户，**不要替用户拍规则裁决**。
别扩范围：M1 只做读剧本 + 排座位 UI；抽袋/发牌是 M2 的事，别顺手实现。
