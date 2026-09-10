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
│   ├── roleDb.ts          # 181 官方角色事实库（官方 botc-release 源）/ ID 规范化与改名别名（ADR-007）
│   ├── roleMap.ts         # 角色查询薄封装（roleById / roleNameById，M3）
│   ├── setup.ts           # 阵营构成表、角色随机分配、恶魔伪装推荐
│   ├── nightOrder.ts      # 夜晚行动排序 + 系统锚点（ADR-006）
│   ├── vote.ts            # 计票与处决判定
│   ├── recap.ts           # 事件流 → Markdown 复盘（F-08）
│   ├── events.ts          # 事件辅助：隐藏类型折叠 / 生死状态回写（M3）
│   ├── seats.ts           # 座位锚号原语：换位/涟漪平移/增删/高水位/复用池（ADR-011）
│   └── ringLayout.ts      # 圆桌环几何：人数×列数 → 座位坐标（ADR-005）
├── data/
│   ├── official-roles.json        # 角色事实数据源
│   └── builtin-scripts/           # 内置官方三版（ADR-015，pnpm run build:builtin 重生成）
├── stores/        # Zustand 状态（动作 = 调 lib 纯函数 + 写 persistence）
│   ├── script.ts          # 剧本导入/选择（F-01）
│   ├── game.ts            # 对局/座位/阶段机（F-02..F-05/F-07）
│   └── events.ts          # 事件流独立 store（F-06，ADR-017）
├── components/
│   ├── setup/             # ScriptImport / ScriptPreview / SeatSetup / SeatGrid（玩家卡+菜单）/ Drawing（抽袋）
│   ├── night/NightPanel.tsx   # 夜晚行动顺序（F-04）
│   ├── day/DayPanel.tsx       # 白天计票/处决/死亡（F-05）
│   ├── home/Home.tsx          # 首页：历史对局列表（F-07b）
│   ├── recap/RecapExport.tsx  # 战报复盘导出（F-08）
│   └── Timeline.tsx           # 事件日志时间线（F-06b/c/d）
├── ui/                    # 视觉皮肤单点（tokenSkin.ts：圆环/剪影着色；roleIcons.ts：图标外链；RoleIcon.tsx；素材红线出口，ADR-018）
├── i18n/          # index.ts 初始化（zh-CN 默认）+ zh-CN.json / en.json
├── styles/        # app.css（移动优先；ADR-005 圆桌环座位样式）
├── persistence/   # db.ts（Dexie schema）+ repo.ts（对局/事件读写，F-07）
├── App.tsx        # 阶段路由：首页 / setup 线性流程 / 夜 / 白天 / 复盘（M2/M3）
└── main.tsx
scripts/           # 构建脚本（builtin-scripts 生成器）
tests/e2e/         # Playwright：主链路 导入→分配→首夜→导出 smoke（尚未接入 CI）
fixtures/          # 国内真实剧本 JSON 样本（兼容层测试集）
```

单测与组件测试均在 `src/**/*.test.ts(x)`（vitest + jsdom + @testing-library）。

## 关键数据流

**导入剧本（M1 已实现）**：文件/剪贴板/URL/内置三版 → `scriptStore.importFrom*` →
`scriptParser.parse()` → Script（含 warnings）→ ScriptPreview（错误面板 / 阵营分组 / 相克规则 / info 折叠）

**排座位（M1 已实现）**：ScriptPreview →「排座位」→ `gameStore.createGame(script, n)`
（`lib/seats.addSeat` 折叠生成 1..n）→ SeatGrid（ADR-005 圆桌环 + 玩家卡；
点卡弹菜单：改名 / 交换 / 涟漪平移 / 移除，全走 `lib/seats` 原语）

**开局抽袋**（M2）：scriptStore + 人数 → `setup.buildComposition()` → `setup.assignRoles()` → gameStore 分配角色 → persistence 落盘

**夜晚**（M2）：gameStore 当前在场角色 → `nightOrder.build()` → 清单逐项打勾 → 每勾生成 `night_action` 事件 → 双写 events 表

**白天/计票**（M3）：DayPanel → gameStore.registerNomination / registerVote / registerExecution /
registerDeath / registerRevival / toggleVoteToken → `vote.votesNeeded()` 判过半 →
各动作改写 Game（座位生死/票权）并生成对应事件 → 双写 events 表

**复盘**（M3）：events 表按 gameId 取流 → `recap.generate()` → GameRecap → Markdown 渲染 → 剪贴板/下载

**启动恢复**（M2）：`repo.loadCurrentGame()` → gameStore.hydrate() → 按 `game.phase` 路由 →
scriptStore 为空时从 `game.scriptSnapshot` 重建（ADR-017）

## 部署架构

无后端。构建产物为纯静态文件：
- 主站：香港家中服务器 + cloudflared 隧道到自有域名
- 镜像：CI 自动部署 Cloudflare Pages / GitHub Pages
- PWA Service Worker 缓存全量资源，一次加载后离线可用（缓解内地访问波动）——**计划中：M4 #28（F-09），当前未实现**
