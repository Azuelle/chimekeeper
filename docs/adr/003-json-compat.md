# ADR-003: 剧本 JSON 兼容策略 — bra1n 格式为基准 + Zod 宽松模式

- 日期: 2026-09-05
- 状态: 已接受

## 背景

国内剧本生态以 bra1n/townsquare 的 JSON 格式为事实标准，但各剧本制作工具
（bloodstar、官方 script tool、各种国内二创工具）会加入自定义字段
（如 logo、almanac、bootlegger、alt_night_order 等）。严格 schema 校验器
（如 Pocket Grimoire 的读取器）遇未知字段直接报错，是国内用户的实际痛点。

## 决定

1. 以 bra1n 格式为解析基准（`_meta` 首项 + 角色数组 + jinx）
2. 使用 Zod `.passthrough()` 宽松模式：未知字段保留、不校验、记 info 级 warning
3. 必需字段缺失（如 role 缺 team）→ 中文可读错误，指明角色名与字段名
4. 已知语义字段（如夜晚顺序覆盖类）→ 识别并按语义处理或记 warning
5. 建立 `fixtures/` 国内真实剧本样本集，解析兼容性由测试强制保障

## 后果

- 正面：导入成功率最大化；警告机制让说书人知道"哪里可能不对"而非直接失败
- 负面：宽松解析可能掩盖剧本本身的错误（如拼错的字段名被静默透传）——缓解：warning 面板默认展开可见
