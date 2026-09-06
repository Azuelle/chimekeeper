# 项目状态（交接快照）

> 更新：2026-09-07 · **接手前必读此文件**。

## 已完成

- M0 骨架：CI（tsc+vitest+build+docs-guard）、文档体系、类型、fixtures
- **数据层全部就绪**（`src/lib/`，纯函数）：
  - `scriptParser` 剧本宽松解析 + 角色注水（ADR-003/007）
  - `roleDb` 181 官方角色事实库（官方 botc-release 源，含实验角色，ADR-007；`npm run refresh:roledb` 刷新）
  - `setup` 抽袋默认构成 + setup 角色提示文案（ADR-008，不做自动计算）
  - `nightOrder` 夜晚行动顺序 + 系统锚点（ADR-006）
  - `vote` 计票 / `recap` 复盘 Markdown 导出
  - `seats` 座位锚号原语：换位/增删/高水位/涟漪平移/复用池（ADR-011）
  - `ringLayout` 圆桌环几何纯函数：顶行左起 + 等长 rail + 底行收窄/2 列整行闭环（ADR-005）
- **M1 开桌完成**（feat/m1-ui 分支）：
  - F-01 读剧本 UI：粘贴 / 上传 / URL 三入口 + 错误中文提示（F-01c）
    + 内置官方三版一键选择（ADR-015；生成器 `scripts/build-builtin-scripts.mjs`，
    产物 `src/data/builtin-scripts/`，npm run build:builtin 重生成）
  - F-01e 预览：角色按阵营分组、相克规则、warning 面板（info 级默认折叠防注水刷屏）
  - F-02 排座位 UI v2（ADR-005 改写）：座位沿**圆桌环**顺时针连续相邻（顶行不一定
    整行、左右 rail 等长、底部收窄居中；手机竖屏 2 列走整行闭环省空间 / 桌面按
    容器宽 3–8 列自适应，`lib/ringLayout` 纯函数下发行列）；
    座位单元为**玩家卡**（自绘 token 圆环 + 名牌 + 右侧提示标记占位），
    整卡点击弹菜单：编辑名字（内联）/交换座位/平移座位（涟漪式）/移除座位
    （默认退役、可选编号入复用池）；M2/M3 菜单项置灰占位标注阶段。
    阵营着色数据位 `Seat.alignment` 已就绪（good 蓝 / evil 红 / 未分配灰环）。
    配套：编号退役表 + 「启用退役编号」批量入池（ADR-011 修订，seatHighWater
    只增不减；addSeat 优先消费池中最小号）。角色数据 refresh 顺带保留官方
    reminder 文案字段（M2 夜单提示词来源）。
  - F-10 i18n 初始化（zh-CN 默认 + en fallback）+ 移动优先样式
  - 测试 100 个全绿；`npm run ci`（tsc+vitest+build）通过；构建约 122KB gzip（N-01 达标）
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

任务分解（建议顺序）：

1. persistence 接线：gameStore 变更双写 Dexie（`persistence/db.ts` schema 已就绪），启动时恢复
2. `components/setup/Drawing`（F-03）：官方人数表构成展示 + setup 角色提示高亮
   （ADR-008 只提示不自动算，`lib/setup.ts` 的 `baseComposition`/`setupRoleHints` 已就绪）
   + 手动 +/- + `assignRoles` 随机分配 + 恶魔伪装推荐
3. `components/night/NightPanel`（F-04）：`lib/nightOrder.build()` 清单 + 逐项打勾 → `night_action` 事件
4. 事件流（F-06a/b）：`lib/events.ts` 构造辅助 + 时间线视图（按 round+phase 分组）

## 红线（违反 = 打回）

- UI 术语必须与中文钟楼百科对齐（PRD §3 有对照表）
- 不自动计算 setup 调整——只提示 + 手动加减（ADR-008）
- `seatNumber` 编号不改变——移除默认**退役不复用**；仅当勾选「编号入复用池」或
  批量启用退役编号后，`addSeat` 才按池中最小号消费（ADR-011 修订；seatHighWater 只增不减）
- 座位操作全走 `lib/seats.ts` / `lib/ringLayout.ts`
- `src/lib/` 不许 import React（纯函数层）
- 现有测试不许破坏；新代码配测试
- commit 前 `npm run ci` 全绿

## 给 opencode agent 的话

数据层**别重写，直接调用**——lib 的 JSDoc 和测试就是文档。
规则歧义先查 `docs/adr/` 和 `docs/reference/`（设置调整/认知覆盖/复盘实例都有蒸馏），
再不确定就在 PR 描述里留问题标签问用户，**不要替用户拍规则裁决**。
别扩范围：M2 只做抽袋/夜晚顺序/事件流/持久化；白天计票是 M3 的事，别顺手实现。
