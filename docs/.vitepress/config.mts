import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '染·魔典',
  description: '血染钟楼线下说书辅助 · 过程记录 · 复盘导出',
  lang: 'zh-CN',
  themeConfig: {
    nav: [
      { text: '需求', link: '/PRD' },
      { text: '速查表', link: '/GLOSSARY' },
      { text: '数据模型', link: '/DATA-MODEL' },
      { text: '架构', link: '/ARCHITECTURE' },
    ],
    sidebar: [
      {
        text: '项目文档',
        items: [
          { text: '需求文档 (PRD)', link: '/PRD' },
          { text: '编号速查表', link: '/GLOSSARY' },
          { text: '数据模型', link: '/DATA-MODEL' },
          { text: '架构说明', link: '/ARCHITECTURE' },
        ],
      },
      {
        text: '架构决策记录',
        items: [
          { text: '001 选型', link: '/adr/001-tech-stack' },
          { text: '002 砍范围', link: '/adr/002-mvp-scope' },
          { text: '003 宽容', link: '/adr/003-json-compat' },
          { text: '004 版权线', link: '/adr/004-license' },
          { text: '005 网格', link: '/adr/005-responsive-grid-layout' },
          { text: '006 锚点', link: '/adr/006-night-system-steps' },
          { text: '007 注水库', link: '/adr/007-builtin-role-db' },
        ],
      },
      {
        text: '规则参考',
        items: [
          { text: '实体版运作流程', link: '/reference/setup-and-night-flow' },
          { text: '夜晚顺序（中文社区版）', link: '/reference/night-order-cn' },
        ],
      },
    ],
  },
});
