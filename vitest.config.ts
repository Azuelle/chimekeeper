import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // 只统计业务代码（lib/stores/components/ui/types 等），排除测试/入口
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
      reporter: ['text', 'text-summary'],
      // 阈值 = 当前基线下方留余量（M1 基线 lines≈71/funcs≈84/branches≈87）。
      // 随 M2 补测试后再逐步上调，避免本机/CI 波动误杀。
      thresholds: {
        statements: 65,
        lines: 65,
        functions: 70,
        branches: 75,
      },
    },
  },
});
