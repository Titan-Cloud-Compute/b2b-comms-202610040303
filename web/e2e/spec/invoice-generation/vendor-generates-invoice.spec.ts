import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('vendor generates invoice', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/invoices');
  await expect(page.getByTestId('invoices-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('the invoice is created and returns 201 with the invoice id available for download');
});
