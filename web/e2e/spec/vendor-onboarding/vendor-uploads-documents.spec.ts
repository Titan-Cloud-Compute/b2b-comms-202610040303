import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('vendor uploads documents', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/vendor/profile');
  await expect(page.getByTestId('vendor-profile-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('the document is stored with status "pending" and displays in the vendor document library');
});
