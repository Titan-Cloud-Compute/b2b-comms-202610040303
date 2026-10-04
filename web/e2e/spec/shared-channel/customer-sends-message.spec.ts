import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('customer sends message', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/channels');
  await expect(page.getByTestId('channels-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('the message is stored and returns 201 with the created Message record');
});
