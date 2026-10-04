import { test, expect } from '@playwright/test';
import { mockApi, login } from '../_support';

test.use({ serviceWorkers: 'block' });

test('user configures notifications', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/settings/notifications');
  await expect(page.getByTestId('settings-notifications-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('the preferences are updated and returns 200 with the stored NotificationPreference record');
});
