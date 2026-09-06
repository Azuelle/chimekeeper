# 司钟 (Chimekeeper)

[![CI](https://github.com/Azuelle/chimekeeper/actions/workflows/ci.yml/badge.svg)](https://github.com/Azuelle/chimekeeper/actions/workflows/ci.yml) [![CodeQL](https://github.com/Azuelle/chimekeeper/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/Azuelle/chimekeeper/actions/workflows/github-code-scanning/codeql) [![Deploy Docs](https://github.com/Azuelle/chimekeeper/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/Azuelle/chimekeeper/actions/workflows/deploy-docs.yml)

//! TODO: make this less ai sloppy

> 《血染钟楼》线下说书辅助 · 过程记录 · 复盘导出的 local-first PWA
> **非官方社区创作**，与 The Pandemonium Institute 无关。遵循 [TPI 社区内容政策](https://bloodontheclocktower.com/pages/community-created-content-policy)。永久免费。

## 为什么做这个

现有工具各有所缺（详见[文档站](docs/)）：

- **Pocket Grimoire**：模拟实体魔典出色，但无过程记录、无玩家编号、内地访问不便、剧本 JSON 解析严格
- **官方 botc.app**：面向线上对局，不适合线下说书
- **各类记录器小程序**：有复盘无魔典、易丢进度、不支持自定义剧本

本项目 = **魔典运行辅助 + 结构化事件日志 + 一键复盘**，三合一，且为国内线下环境优化（玩家编号、中文优先、离线可用、无需梯子）。

## 功能状态

🚧 早期开发中。功能清单与验收标准见 [docs/PRD.md](docs/PRD.md)。

## 开发

```bash
pnpm install
pnpm run dev        # 开发服务器
pnpm run test       # Vitest 单测
pnpm run build      # 构建静态产物（dist/，可任意静态托管）
pnpm run docs:dev   # 文档站开发预览
```

## 参与贡献

- 行为规范与技术约定：[AGENTS.md](AGENTS.md)（人类 contributor 同样适用）
- 数据模型是唯一真相源：[docs/DATA-MODEL.md](docs/DATA-MODEL.md)
- 架构决策记录：[docs/adr/](docs/adr/)

## License

代码 MIT（见 [LICENSE](LICENSE)）。游戏内容版权归 The Pandemonium Institute 所有。
