import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      all: true,
      // 只统计业务代码（lib/stores/components/ui/types 等），排除测试/入口
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
      reporter: ['text', 'text-summary'],
      // 阈值 = 当前覆盖基线下方留余量（当前 lines≈94/branches≈89/funcs≈93）。
      // 后续补测试时继续上调，保持 80+ 的硬门槛。
      thresholds: {
        statements: 90,
        lines: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
});
