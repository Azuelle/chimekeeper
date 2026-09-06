/**
 * i18n 初始化（F-10）：zh-CN 默认，en 完整 fallback。
 * 所有 UI 文案走 t()，禁止组件内硬编码。
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './zh-CN.json';
import en from './en.json';

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: 'zh-CN',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React 已做 XSS 转义
});

export default i18n;
