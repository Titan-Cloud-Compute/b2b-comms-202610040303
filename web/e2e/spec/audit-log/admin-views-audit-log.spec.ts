import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('admin views audit log', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/admin/audit-log');
  await expect(page.getByTestId('admin-audit-log-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('a list of AuditEntry records is displayed in chronological order returns 200');
});
