# ADR-004: 代码 MIT 协议 + TPI 社区内容政策合规

- 日期: 2026-09-05
- 状态: 已接受

## 背景

两个层面的版权约束：
1. 代码层面：主要参照项目 bra1n/townsquare 与 Pocket Grimoire 均为 GPL-3.0，
   直接复制其代码将强制本项目 GPL。
2. 内容层面：游戏角色、美术、文本属 The Pandemonium Institute (TPI)，
   其 Community Created Content Policy 三规则：不冒充官方 / 不商业化 /
   不与官方产品竞争，且禁止上架任何应用商店。

## 决定

1. 项目代码 MIT 开源，全部代码自研，不复制 GPL 项目代码；
   兼容 bra1n JSON 数据格式（格式兼容不构成衍生作品）
2. 页面与 README 显著位置声明非官方社区创作，挂官方 Community Created Content 徽章
3. 永久免费、无广告、无众筹；纯 Web 分发，永不上架应用商店
4. 官方角色图标仅运行时链接引用，不打包进仓库再分发
5. 项目公开发布后主动向 butler@thepandemoniuminstitute.com 发邮件报备

## 后果

- 正面：MIT 对 contributor 最友好；合规姿态降低被 TPI 追责风险
- 负面：GPL 项目的任何代码（哪怕一个函数）都不能抄，只能重写；
  TPI 政策最终解释权在对方，风险只能缓解不能消除
