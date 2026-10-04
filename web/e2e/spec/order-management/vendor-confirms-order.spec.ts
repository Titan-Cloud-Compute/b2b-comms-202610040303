import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('vendor confirms order', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/orders');
  await expect(page.getByTestId('orders-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('the order is updated to status "confirmed" and displays to the customer as confirmed');
});
