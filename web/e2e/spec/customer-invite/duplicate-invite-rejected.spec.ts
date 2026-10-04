import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('duplicate invite rejected', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/admin/customers');
  await expect(page.getByTestId('admin-customers-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('the response returns 409 error indicating the customer already exists');
});
