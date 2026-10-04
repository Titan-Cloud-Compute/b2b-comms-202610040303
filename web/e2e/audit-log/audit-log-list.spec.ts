import { test, expect } from '@playwright/test';
import { mockApi, login } from '../spec/_support';

test.use({ serviceWorkers: 'block' });

const THREE_ENTRIES = [
  { id: '3', action: 'action-c', userId: 'u1', createdAt: '2026-01-03T00:00:00Z' },
  { id: '1', action: 'action-a', userId: 'u1', createdAt: '2026-01-01T00:00:00Z' },
  { id: '2', action: 'action-b', userId: 'u1', createdAt: '2026-01-02T00:00:00Z' },
];

test('shows entries sorted ascending by createdAt', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/admin/audit-log', (route) => {
    if (route.request().method().toUpperCase() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(THREE_ENTRIES),
      });
    } else {
      route.fallback();
    }
  });

  await login(page);
  await page.goto('/#/admin/audit-log');

  const rows = page.locator('[data-testid="audit-log-row"]');
  await expect(rows).toHaveCount(3);

  const actions = await rows.locator('td:nth-child(2)').allTextContents();
  expect(actions).toEqual(['action-a', 'action-b', 'action-c']);
});

test('shows empty state when there are no entries', async ({ page }) => {
  await mockApi(page);
  // default mockApi returns [] for GET requests — no override needed

  await login(page);
  await page.goto('/#/admin/audit-log');

  await expect(page.getByTestId('audit-log-empty')).toBeVisible();
});
