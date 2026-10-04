import { test, expect } from '@playwright/test';
import { mockApi, login } from '../spec/_support';

test.use({ serviceWorkers: 'block' });

test('customer creates order', async ({ page }) => {
  await mockApi(page);

  // In-test order store
  const orderStore: Array<{ id: string; status: string; customerId: string; vendorId: string; items: Array<{ description: string; quantity: number; unitPrice: number }> }> = [];
  let lastPostBody: unknown = null;
  let lastPatchBody: unknown = null;

  await page.route('**/api/orders**', async (route) => {
    const req = route.request();
    const method = req.method().toUpperCase();
    const url = req.url();
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (method === 'GET') {
      return json(orderStore);
    }
    if (method === 'POST') {
      const body = req.postDataJSON() as { vendorId: string; items: Array<{ description: string; quantity: number; unitPrice: number }> };
      lastPostBody = body;
      const newOrder = { id: 'o1', status: 'pending', customerId: 'c1', vendorId: body.vendorId, items: body.items };
      orderStore.push(newOrder);
      return json({ id: newOrder.id, status: newOrder.status, customerId: newOrder.customerId }, 201);
    }
    if (method === 'PATCH' && url.includes('/api/orders/o1/confirm')) {
      const body = req.postDataJSON() as { estimatedDelivery: string };
      lastPatchBody = body;
      const order = orderStore.find(o => o.id === 'o1');
      if (order) order.status = 'confirmed';
      return json({ id: 'o1', status: 'confirmed' });
    }
    return route.continue();
  });

  await login(page);
  await page.goto('/#/orders');

  // Empty state shows initially
  await expect(page.getByTestId('orders-empty')).toBeVisible();

  // Fill order form
  await page.locator('#vendorId').fill('v1');
  await page.locator('[data-testid="line-item-desc-0"]').fill('Widget');
  await page.locator('[data-testid="line-item-qty-0"]').fill('2');
  await page.locator('[data-testid="line-item-price-0"]').fill('9.5');

  // Submit
  await page.getByTestId('order-create-form').locator('button[type="submit"]').click();

  // Verify POST body
  await expect.poll(() => lastPostBody).toEqual({
    vendorId: 'v1',
    items: [{ description: 'Widget', quantity: 2, unitPrice: 9.5 }],
  });

  // Order row should appear with status pending
  await expect(page.getByTestId('order-row')).toBeVisible();
  await expect(page.getByTestId('order-status')).toContainText('pending');
});

test('vendor confirms order', async ({ page }) => {
  await mockApi(page);

  const orderStore: Array<{ id: string; status: string; customerId: string; vendorId: string; items: Array<{ description: string; quantity: number; unitPrice: number }> }> = [
    { id: 'o1', status: 'pending', customerId: 'c1', vendorId: 'v1', items: [{ description: 'Widget', quantity: 2, unitPrice: 9.5 }] },
  ];
  let lastPatchBody: unknown = null;

  await page.route('**/api/orders**', async (route) => {
    const req = route.request();
    const method = req.method().toUpperCase();
    const url = req.url();
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (method === 'GET') {
      return json(orderStore);
    }
    if (method === 'PATCH' && url.includes('/api/orders/o1/confirm')) {
      const body = req.postDataJSON() as { estimatedDelivery: string };
      lastPatchBody = body;
      const order = orderStore.find(o => o.id === 'o1');
      if (order) order.status = 'confirmed';
      return json({ id: 'o1', status: 'confirmed' });
    }
    return route.continue();
  });

  await login(page);
  await page.goto('/#/orders');

  // Order row should be visible with pending status
  await expect(page.getByTestId('order-row')).toBeVisible();
  await expect(page.getByTestId('order-status')).toContainText('pending');

  // Fill delivery date and confirm
  const futureDate = '2027-01-15';
  await page.locator('[data-testid="order-delivery-o1"]').fill(futureDate);
  await page.getByTestId('order-confirm').click();

  // Verify PATCH body
  await expect.poll(() => lastPatchBody).toEqual({ estimatedDelivery: futureDate });

  // Status should now be confirmed and confirm button gone
  await expect(page.getByTestId('order-status')).toContainText('confirmed');
  await expect(page.getByTestId('order-confirm')).not.toBeVisible();
});
