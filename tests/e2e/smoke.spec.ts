import { test, expect } from '@playwright/test';

// M0 冒烟测试：页面能打开、标题正确。
// M1+ 补充主链路 e2e：导入剧本 → 分角 → 首夜 → 导出复盘。
test('首页加载', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/司钟/);
  await expect(page.getByText('非官方社区创作')).toBeVisible();
});
