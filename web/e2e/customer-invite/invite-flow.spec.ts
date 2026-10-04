import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test.describe('customer invite flow', () => {
  async function setupMocks(page: any) {
    const store: { user: { id: string; email: string; role: string } | null } = { user: null };
    const customers: Array<{ id: string; email: string }> = [];
    let nextId = 1;

    await page.route('**/api/**', async (route: any) => {
      const req = route.request();
      const method = req.method().toUpperCase();
      const apiPath = new URL(req.url()).pathname
        .replace(/^.*\/api\//, '')
        .replace(/^api\//, '')
        .replace(/^\//, '');
      const json = (body: unknown, status = 200) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

      if (method === 'POST' && apiPath === 'auth/login') {
        store.user = { id: '1', email: 'admin@b2b-portal.example.com', role: 'ADMIN' };
        return json(store.user);
      }
      if (method === 'GET' && apiPath === 'users/me') {
        return store.user ? json(store.user) : json({ message: 'Unauthorized' }, 401);
      }
      if (method === 'GET' && apiPath === 'admin/customers') {
        return json([...customers]);
      }
      if (method === 'POST' && apiPath === 'admin/customers/invite') {
        const body = JSON.parse(req.postData() || '{}');
        const email = body.email as string;
        const existing = customers.find(c => c.email === email);
        if (existing) {
          return json({ message: 'Customer already exists' }, 409);
        }
        const customer = { id: String(nextId++), email };
        customers.push(customer);
        return json({ customerId: customer.id, email: customer.email, invitationSent: true }, 201);
      }
      if (method === 'GET') return json([]);
      return json({ ok: true });
    });

    return { store, customers };
  }

  async function login(page: any) {
    await page.goto('/#/login');
    await page.locator('#email').fill('admin@b2b-portal.example.com');
    await page.locator('#password').fill('password1234');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/#\/(?!login)/, { timeout: 10_000 });
  }

  test('invite new customer shows success and adds to list', async ({ page }) => {
    await setupMocks(page);
    await login(page);
    await page.goto('/#/admin/customers');
    await expect(page.getByTestId('admin-customers-screen')).toBeVisible();

    await page.getByTestId('invite-email').fill('buyer@corp.example.com');
    await page.getByTestId('invite-submit').click();

    await expect(page.getByTestId('invite-success')).toContainText('Invitation sent');
    await expect(page.getByTestId('customer-list').locator('[data-testid="customer-row"]')).toHaveCount(1);
    await expect(page.getByTestId('customer-list')).toContainText('buyer@corp.example.com');
  });

  test('duplicate invite shows already exists error and only one customer row', async ({ page }) => {
    await setupMocks(page);
    await login(page);
    await page.goto('/#/admin/customers');
    await expect(page.getByTestId('admin-customers-screen')).toBeVisible();

    // First invite
    await page.getByTestId('invite-email').fill('buyer@corp.example.com');
    await page.getByTestId('invite-submit').click();
    await expect(page.getByTestId('invite-success')).toBeVisible();

    // Second invite with same email
    await page.getByTestId('invite-email').fill('buyer@corp.example.com');
    await page.getByTestId('invite-submit').click();

    await expect(page.getByTestId('invite-error')).toContainText('already exists');
    await expect(page.getByTestId('customer-list').locator('[data-testid="customer-row"]')).toHaveCount(1);
  });

  test('submit button is disabled for invalid email', async ({ page }) => {
    await setupMocks(page);
    await login(page);
    await page.goto('/#/admin/customers');
    await expect(page.getByTestId('admin-customers-screen')).toBeVisible();

    await page.getByTestId('invite-email').fill('not-an-email');
    await expect(page.getByTestId('invite-submit')).toBeDisabled();
  });
});
