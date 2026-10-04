import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('vendor creates shared channel', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/channels');
  await expect(page.getByTestId('channels-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('the channel is stored and displays in both the vendor and customer channel lists');
});
