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
├── lib/           # 纯函数逻辑层（无 React/DOM/IndexedDB 依赖）
│   ├── scriptParser.ts    # 剧本 JSON 宽松解析（Zod passthrough）+ 注水
│   ├── roleDb.ts          # 143 官方角色事实库 / ID 规范化查询（ADR-007）
│   ├── setup.ts           # 阵营构成表、角色随机分配、恶魔伪装推荐
│   ├── nightOrder.ts      # 夜晚行动排序 + 系统锚点（ADR-006）
│   ├── vote.ts            # 计票与处决判定
│   ├── recap.ts           # 事件流 → Markdown 复盘
│   └── seats.ts           # 座位锚号原语：换位/增删/高水位（ADR-011）
├── data/
│   ├── official-roles.json        # 角色事实数据源
│   └── builtin-scripts/           # 内置官方三版（ADR-015，npm run build:builtin 重生成）
├── stores/        # Zustand 状态（动作 = 调 lib 纯函数）
│   ├── script.ts          # 剧本导入/选择（F-01）
│   └── game.ts            # 对局 + 座位 CRUD，全走 lib/seats 原语（F-02）
├── components/
│   └── setup/             # M1：ScriptImport / ScriptPreview / SeatSetup / SeatGrid
├── i18n/          # index.ts 初始化（zh-CN 默认）+ zh-CN.json / en.json
├── styles/        # app.css（移动优先；ADR-005 座位网格）
├── persistence/   # db.ts（Dexie schema v1；M2 接线双写）
├── App.tsx        # 线性流程：导入剧本 → 剧本预览 → 排座位
└── main.tsx
scripts/           # 构建脚本（builtin-scripts 生成器）
tests/e2e/         # Playwright：主链路 导入→分配→首夜→导出（待启用）
fixtures/          # 国内真实剧本 JSON 样本（兼容层测试集）
```

单测与组件测试均在 `src/**/*.test.ts(x)`（vitest + jsdom + @testing-library）。

## 关键数据流

**导入剧本（M1 已实现）**：文件/剪贴板/URL/内置三版 → `scriptStore.importFrom*` →
`scriptParser.parse()` → Script（含 warnings）→ ScriptPreview（错误面板 / 阵营分组 / 相克规则 / info 折叠）

**排座位（M1 已实现）**：ScriptPreview →「排座位」→ `gameStore.createGame(script, n)`
（`lib/seats.addSeat` 折叠生成 1..n）→ SeatGrid（ADR-005 网格；昵称 / 增删 / 换位走原语）

**开局抽袋**（M2）：scriptStore + 人数 → `setup.buildComposition()` → `setup.assignRoles()` → gameStore 分配角色 → persistence 落盘

**夜晚**（M2）：gameStore 当前在场角色 → `nightOrder.build()` → 清单逐项打勾 → 每勾生成 `night_action` 事件 → 双写 events 表

**复盘**（M3）：events 表按 gameId 取流 → `recap.generate()` → GameRecap → Markdown 渲染 → 剪贴板/下载

## 部署架构

无后端。构建产物为纯静态文件：
- 主站：香港家中服务器 + cloudflared 隧道到自有域名
- 镜像：CI 自动部署 Cloudflare Pages / GitHub Pages
- PWA Service Worker 缓存全量资源，一次加载后离线可用（缓解内地访问波动）
