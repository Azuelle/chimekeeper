# AGENTS.md — AI 协作规范

本文件是给 AI 协作者（Claude / Copilot / 其他 coding agent）的常驻指令。每次会话开始前阅读。

## 项目一句话

《血染钟楼》（Blood on the Clocktower）线下说书辅助 + 过程记录 + 复盘导出的 local-first PWA。非官方社区创作，永久免费，不上架任何应用商店。

## 技术栈（不许擅自变更）

- Vite + React 19 + TypeScript（strict）
- 状态管理：Zustand
- 本地持久化：Dexie（IndexedDB）
- Schema 校验：Zod（宽松模式，见下）
- i18n：react-i18next（默认 zh-CN，fallback en）
- 测试：Vitest（单测）+ Playwright（e2e）
- 文档站：VitePress（源码在 `docs/`）

## 唯一真相源

| 关注点 | 真相源 | 规则 |
|---|---|---|
| 数据模型 | `src/types/` + `docs/DATA-MODEL.md` | **改 types 前必须先改 DATA-MODEL.md，并在 PR 说明** |
| 需求与验收标准 | `docs/PRD.md` | 实现前核对对应验收条款 |
| 架构决策 | `docs/adr/` | 与 ADR 冲突的实现方案先停下来提问 |

## 硬性规则（违反 = PR 打回）

1. **不许新增依赖**，除非在 PR 描述中说明理由并获得确认。
2. **所有用户可见文本走 i18n key**，禁止硬编码中英文案。key 命名：`功能域.场景.条目`（如 `scriptImport.error.missingTeam`）。
3. **游戏内容（角色名/能力/夜晚提示词）不做 UI 层翻译**——它们来自剧本 JSON 数据，不是 UI 文案。
4. **剧本 JSON 解析必须是宽松模式**：未知字段透传不报错（记 warning），缺失必需字段给中文可读错误并指出具体角色/字段。兼容基准 = bra1n/townsquare 格式 + `fixtures/` 下全部国内样本。
5. **事件类型不许超出 `src/types/events.ts` 的 `EventType` 枚举**。新增事件类型 = ADR + 数据模型文档更新。
6. `src/lib/` 保持纯函数，不 import React / 不碰 DOM / 不碰 IndexedDB。
7. 每个功能 PR 必须附带：Vitest 单测（lib 层）+ 更新相关文档（或声明无需更新）。
8. 代码风格：TS strict 全过、无 `any`（`unknown` + 收窄代替）、无 `// @ts-ignore`。

## 版权红线（TPI 社区内容政策）

- 页面显著位置保留"非官方社区创作"声明与 Community Created Content 徽章
- 永不加入付费、广告、众筹入口
- 不复制 bra1n/townsquare 与 Pocket Grimoire 的代码（两者均 GPL-3.0，本项目 MIT）；兼容其 JSON 数据格式是允许的
- 官方角色图标仅链接引用、不打包再分发

## 当前阶段

见 `docs/PRD.md` 的 Milestone 一节。实现任何功能前先确认它在当前 milestone 范围内；范围外的功能先记录在 issue，不要直接写。
