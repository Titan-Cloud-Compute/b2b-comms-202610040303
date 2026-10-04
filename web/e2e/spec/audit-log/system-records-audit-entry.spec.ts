import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('system records audit entry', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/admin/audit-log');
  await expect(page.getByTestId('admin-audit-log-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('the AuditEntry is stored and returns 201 with the created record');
});
