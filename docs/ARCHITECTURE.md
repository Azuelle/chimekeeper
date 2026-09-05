# ARCHITECTURE — 架构说明

> 与 ADR 的关系：本文件描述"现状如何组织"，ADR 记录"当时为什么这样决定"。

## 分层

```
┌─────────────────────────────┐
│  components/   React UI 层   │  只读 store，不写业务逻辑
├─────────────────────────────┤
│  stores/       Zustand 状态  │  动作 = 调 lib 纯函数 + 写 persistence
├─────────────────────────────┤
│  lib/          纯函数逻辑层  │  无 React/DOM/IndexedDB 依赖，可 100% 单测
├─────────────────────────────┤
│  persistence/  Dexie 封装    │  IndexedDB 读写唯一入口
└─────────────────────────────┘
```

**铁律：lib/ 不 import React、不碰 DOM、不碰 IndexedDB**（AGENTS.md 规则 6）。
效果：剧本解析、角色分配、夜晚排序、计票、复盘生成全部可脱离 UI 测试。

## 目录

```
src/
├── types/         # 数据模型（唯一真相源，先改 docs/DATA-MODEL.md）
├── lib/
│   ├── scriptParser.ts    # 剧本 JSON 宽松解析（Zod passthrough）
│   ├── setup.ts           # 阵营构成表、角色随机分配、恶魔伪装推荐
│   ├── nightOrder.ts      # 夜晚行动排序
│   ├── vote.ts            # 计票与处决判定
│   ├── recap.ts           # 事件流 → Markdown 复盘
│   └── events.ts          # 事件构造辅助
├── stores/        # gameStore, scriptStore, uiStore
├── components/    # 按场景组织：setup/ grimoire/ night/ day/ recap/
├── i18n/          # zh-CN.json（默认）+ en.json
└── persistence/   # db.ts (Dexie schema)
tests/
├── e2e/           # Playwright：主链路 导入→分配→首夜→导出
fixtures/          # 国内真实剧本 JSON 样本（兼容层测试集）
docs/              # VitePress 文档站源码
```

## 关键数据流

**导入剧本**：文件/剪贴板 → `scriptParser.parse()` → Script（含 warnings）→ scriptStore → 警告面板展示

**开局**：scriptStore + 人数 → `setup.buildComposition()` → `setup.assignRoles()` → gameStore 创建 Game → persistence 落盘

**夜晚**：gameStore 当前在场角色 → `nightOrder.build()` → 清单逐项打勾 → 每勾生成 `night_action` 事件 → 双写 events 表

**复盘**：events 表按 gameId 取流 → `recap.generate()` → GameRecap → Markdown 渲染 → 剪贴板/下载

## 部署架构

无后端。构建产物为纯静态文件：
- 主站：香港家中服务器 + cloudflared 隧道到自有域名
- 镜像：CI 自动部署 Cloudflare Pages / GitHub Pages
- PWA Service Worker 缓存全量资源，一次加载后离线可用（缓解内地访问波动）
