import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '染·魔典',
  description: '血染钟楼线下说书辅助 · 过程记录 · 复盘导出',
  lang: 'zh-CN',
  themeConfig: {
    nav: [
      { text: '需求', link: '/PRD' },
      { text: '数据模型', link: '/DATA-MODEL' },
      { text: '架构', link: '/ARCHITECTURE' },
      { text: 'ADR', link: '/adr/000-template' },
    ],
    sidebar: [
      {
        text: '项目文档',
        items: [
          { text: '需求文档 (PRD)', link: '/PRD' },
          { text: '数据模型', link: '/DATA-MODEL' },
          { text: '架构说明', link: '/ARCHITECTURE' },
        ],
      },
      {
        text: '架构决策记录',
        items: [
          { text: 'ADR-001 技术栈选型', link: '/adr/001-tech-stack' },
          { text: 'ADR-002 v1 范围', link: '/adr/002-mvp-scope' },
          { text: 'ADR-003 JSON 兼容策略', link: '/adr/003-json-compat' },
          { text: 'ADR-004 协议与版权', link: '/adr/004-license' },
        ],
      },
    ],
  },
});
