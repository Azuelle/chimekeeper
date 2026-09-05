# fixtures — 剧本 JSON 测试样本集

这里存放真实的剧本 JSON 样本，作为剧本解析兼容层（`src/lib/scriptParser.ts`）的测试集。
每次修改解析逻辑，必须保证全部样本可导入（或按预期给出可读错误）。

## 收集要求

- **覆盖多样性**：官方 script tool 导出、bloodstar 导出、国内二创工具导出、手写 JSON
- **覆盖边界**：含自定义字段（logo/almanac/bootlegger）、含 jinx、含 fabled/traveler、缺字段的坏样本
- 每个样本注明来源与特征，命名：`来源-剧本名-特征.json`

## 版权注意

剧本 JSON 中的角色名称与能力文本版权归 The Pandemonium Institute 所有，
此处仅作为非商业社区工具的兼容性测试数据，遵循 TPI 社区内容政策。
自定义（homebrew）剧本请确认作者允许收录。
