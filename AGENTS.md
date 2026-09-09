# AGENTS.md

> 本文件面向人类协作者与 AI 编码代理。修改代码前必读。

## 项目一句话

血染钟楼（Blood on the Clocktower）线下说书辅助工具：local-first Web 应用，
中文优先，开源非商业。桌面/手机浏览器双端，说书人视角。

## 目录地图

| 路径 | 内容 |
|---|---|
| `docs/PRD.md` | 需求文档（F-xx 功能编号 + 速记名） |
| `docs/GLOSSARY.md` | **编号 × 速记名对照表（唯一权威映射）** |
| `docs/DATA-MODEL.md` | 数据模型（Game/Event/Seat/Role） |
| `docs/ARCHITECTURE.md` | 架构说明（分层 + 依赖方向） |
| `docs/adr/NNN-*.md` | 架构决策记录（ADR） |
| `docs/STATUS.md` | **稳定状态快照 + 当前里程碑指针（接手前必读；WIP 任务分解见 GitHub Issue，决策见 ADR）** |
| `docs/reference/` | 从百科蒸馏的规则参考（设置调整/认知覆盖/复盘实例等） |
| `src/types/` | TS 类型（script.ts / game.ts / events.ts） |
| `src/lib/` | 纯函数核心逻辑（解析/注水库/抽袋/夜单/计票/战报/座位） |
| `src/stores/` | Zustand stores |
| `src/components/` | React 组件（魔典/夜单/白天面板/时间线） |
| `src/i18n/` | zh-CN / en 文案 |
| `src/persistence/` | Dexie(IndexedDB) 封装 |
| `fixtures/` | 测试剧本 JSON（官方工具导出 + 手搓最小例） |

## 硬约束（每次编码必须遵守）

1. **类型先行**：新数据结构先改 `src/types/`，写清字段注释，再写解析/序列化。
2. **纯函数优先**：复杂逻辑放 `src/lib/`（不 import React），UI 只做渲染与事件转发。
3. **local-first**：无服务端、无账号体系；状态持久化在 IndexedDB。
4. **编号引用**：功能/决策用编号引用（F-03 抽袋、ADR-011 锚号），见 GLOSSARY。
5. **TPI 合规**：不复制官方美术/文本资产；角色名/能力文案属官方，项目 MIT 仅覆盖代码。
6. **中文优先**：UI 默认 zh-CN，en 为 secondary。
7. **CI 必过**：`pnpm run ci` = tsc + vitest run --coverage + vite build + vitepress docs 构建
   （coverage 阈值见 vitest.config.ts；docs-guard 为 PR 内强制检查：改 types/stores 必须同步 docs）。提交前本地跑通。
8. **commit 规范**：`feat|fix|docs|refactor|test|chore: 中文简述`。
   AI 参与时末尾加 `Co-authored-by: <实际执行的模型> <该模型的 noreply 邮箱>`——
   **谁干就标谁**（GLM 标 GLM、DeepSeek 标 DeepSeek），别错标、别统一标。
   模型身份**以运行时/环境报告的 model id 为准，不信模型自述**（模型常自称别家，如 K3 自称 Claude）；
   拿不准时由发起 session 的人拍板模型名，别猜。
9. **术语对齐**：界面上出现的所有术语必须与中文钟楼百科官方术语表对齐，禁止自造
   （如"夜单"→"夜晚行动顺序"）。速记名仅供内部沟通，不进 UI 文案。

## 工作节奏（回合纪律）

- 单条消息只做明确要求的那一件事；完成 = `pnpm run ci` 绿 + 汇报，即停。
- 规则/术语/产品取舍拿不准 → 停下列问题清单，不替用户拍板（硬约束第 9 条的执行细则）。
- 动 `src/types/` / `src/stores/`，或一次改 >3 个文件：先给变更计划，等确认。
- 严格按里程碑 Issue 分解走，别跨里程碑"顺手"实现。

## 开发

```bash
pnpm install
pnpm run dev      # 开发（含 i18n/types 检查）
pnpm test         # vitest
pnpm run ci       # 提交前必跑
```

## 当前里程碑

见 `docs/STATUS.md`（稳定快照 + 里程碑指针）与 `docs/PRD.md` 的 M-x 表格。
**当前里程碑的任务分解（WIP）见对应 GitHub Issue**（不在 STATUS 里，避免并行分支改同一文件冲突）。
实现顺序：M0 骨架 → M1 开桌 → M2 入夜 → M3 天亮（v0.5 内测）→ M4 补全 → M5 上线。

## 协作模式（用户 ↔ AI）

- 用户负责：验收标准、fixture 剧本、线下实测反馈、最终拍板。
- AI 负责：把决策翻译成 ADR/PRD/类型/lib/组件/测试，保持文档与代码同步。
- 一切规则分歧以 **中文钟楼百科 + 官方 Almanac** 为准；工具不做法官。
