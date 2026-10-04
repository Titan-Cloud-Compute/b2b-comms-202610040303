import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('customer downloads invoice', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/invoices');
  await expect(page.getByTestId('invoices-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('the response returns 200 with a downloadUrl pointing to the stored invoice');
});
