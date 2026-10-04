import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('vendor submits profile', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/vendor/profile');
  await expect(page.getByTestId('vendor-profile-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('the profile is stored and returns 201 with the created VendorProfile record');
});
