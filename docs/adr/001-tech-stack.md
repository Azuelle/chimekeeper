# ADR-001: 技术栈选型 — Vite + React + TS + Zustand + Dexie + Zod

- 日期: 2026-09-05
- 状态: 已接受

## 背景

项目为单人业余开发 + AI 协作（vibe 工作流），技术栈选型权重：
(1) AI 训练语料丰富度（生成质量）(2) 类型安全（数据模型是项目地基）
(3) 移动端 PWA 支持 (4) 学习成本（作者有 TS/JS 基础，无大型前端项目经验）。

## 决定

- 构建：Vite
- 框架：React 19（而非 Vue/Svelte——AI 语料最多）
- 状态：Zustand（轻量，适合单页面工具，AI 熟悉度高）
- 持久化：Dexie 封装 IndexedDB（解决"微信清后台丢进度"核心痛点）
- 校验：Zod 宽松模式做剧本 JSON 兼容层
- i18n：react-i18next，默认 zh-CN fallback en
- 测试：Vitest + Playwright
- 文档站：VitePress，源码与代码同仓 `docs/`
- 部署：纯静态产物 → 香港自部署（cloudflared）+ Cloudflare Pages 镜像
- 无后端：local-first，服务端不存任何对局数据

## 后果

- 正面：全链路 AI 友好；纯静态部署规避备案问题；local-first 天然离线可用
- 负面：React 19 较新，少数库 peer 依赖滞后（已遇到 vitest 版本组合问题，锁定 vitest 3.2.x）；无后端意味着玩家统计（v2）只能做本地聚合，跨设备同步明确不做
