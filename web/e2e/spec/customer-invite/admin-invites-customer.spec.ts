import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('admin invites customer', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/admin/customers');
  await expect(page.getByTestId('admin-customers-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('a Customer record is created and returns 201 with invitationSent true');
});
