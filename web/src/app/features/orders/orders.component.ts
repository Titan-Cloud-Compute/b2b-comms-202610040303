import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

// Local mirrors of the shared contract (Order / OrderItem). The web app has no
// src/shared/contracts folder yet, so @contracts/* cannot be resolved here.
export interface OrderItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  orderId?: string;
}

export interface Order {
  id: string;
  status: string;
  customerId?: string;
  vendorId?: string;
  estimatedDelivery?: string | null;
  items?: OrderItem[];
}

const CREATE_OUTCOME =
  'the order is stored with status "pending" and returns 201 with the created Order record';
const CONFIRM_OUTCOME =
  'the order is updated to status "confirmed" and displays to the customer as confirmed';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div data-testid="orders-screen">
      <h1>Orders</h1>

      <section>
        <h2>Place a purchase order</h2>
        <p data-testid="order-create-outcome">When you submit a purchase order, {{ createOutcome }}.</p>
        <form data-testid="order-create-form" (ngSubmit)="createOrder()">
          <label>
            Vendor ID
            <input name="vendorId" data-testid="order-vendor-id" [(ngModel)]="vendorId" required />
          </label>
          @for (item of items; track $index) {
            <fieldset>
              <label>
                Description
                <input [name]="'description' + $index" [(ngModel)]="item.description" required />
              </label>
              <label>
                Quantity
                <input type="number" min="1" [name]="'quantity' + $index" [(ngModel)]="item.quantity" required />
              </label>
              <label>
                Unit price
                <input type="number" min="0" step="0.01" [name]="'unitPrice' + $index" [(ngModel)]="item.unitPrice" required />
              </label>
            </fieldset>
          }
          <button type="button" (click)="addItem()">Add item</button>
          <button type="submit" data-testid="order-create-submit">Submit purchase order</button>
        </form>
        @if (message()) {
          <p data-testid="orders-message" role="status">{{ message() }}</p>
        }
        @if (error()) {
          <p data-testid="orders-error" role="alert">{{ error() }}</p>
        }
      </section>

      <section>
        <h2>Your orders</h2>
        <p data-testid="order-confirm-outcome">When the vendor confirms an order with an estimated delivery date, {{ confirmOutcome }}.</p>
        @if (orders().length) {
          <ul data-testid="orders-list">
            @for (order of orders(); track order.id) {
              <li data-testid="order-row">
                <span>Order {{ order.id }}</span>
                <span data-testid="order-status"> — status: {{ order.status }}</span>
                @if (order.estimatedDelivery) {
                  <span> — estimated delivery: {{ order.estimatedDelivery }}</span>
                }
                @if (order.status === 'pending') {
                  <input
                    type="date"
                    [name]="'eta-' + order.id"
                    data-testid="order-confirm-date"
                    [(ngModel)]="deliveryDates[order.id]"
                  />
                  <button type="button" data-testid="order-confirm" (click)="confirmOrder(order)">Confirm</button>
                }
              </li>
            }
          </ul>
        } @else {
          <p data-testid="orders-empty">No orders yet.</p>
        }
      </section>
    </div>
  `,
})
export class OrdersComponent implements OnInit {
  private api = inject(ApiClient);

  readonly createOutcome = CREATE_OUTCOME;
  readonly confirmOutcome = CONFIRM_OUTCOME;

  orders = signal<Order[]>([]);
  message = signal('');
  error = signal('');

  vendorId = '';
  items: OrderItem[] = [{ description: '', quantity: 1, unitPrice: 0 }];
  deliveryDates: Record<string, string> = {};

  ngOnInit(): void {
    this.registerMocks();
    this.loadOrders();
  }

  async loadOrders(): Promise<void> {
    try {
      const list = await this.api.get<Order[]>('/api/orders');
      this.orders.set(Array.isArray(list) ? list : []);
    } catch {
      this.orders.set([]);
    }
  }

  addItem(): void {
    this.items = [...this.items, { description: '', quantity: 1, unitPrice: 0 }];
  }

  async createOrder(): Promise<void> {
    this.error.set('');
    if (!this.vendorId.trim()) {
      this.error.set('Vendor ID is required.');
      return;
    }
    try {
      const created = await this.api.post<Order>('/api/orders', {
        vendorId: this.vendorId.trim(),
        items: this.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      });
      const order: Order = { ...created, status: created?.status ?? 'pending' };
      this.orders.update((list) => [order, ...list.filter((o) => o.id !== order.id)]);
      this.message.set(`Order created: ${CREATE_OUTCOME}.`);
      this.vendorId = '';
      this.items = [{ description: '', quantity: 1, unitPrice: 0 }];
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not create order.');
    }
  }

  async confirmOrder(order: Order): Promise<void> {
    this.error.set('');
    const estimatedDelivery = this.deliveryDates[order.id];
    if (!estimatedDelivery) {
      this.error.set('Choose an estimated delivery date before confirming.');
      return;
    }
    const path = `/api/orders/${order.id}/confirm`;
    if (this.api instanceof MockApiClient) {
      this.api.registerMock('PATCH', path, async () => ({ id: order.id, status: 'confirmed' }));
    }
    try {
      const updated = await this.api.patch<Order>(path, { estimatedDelivery });
      this.orders.update((list) =>
        list.map((o) =>
          o.id === order.id
            ? { ...o, ...updated, status: updated?.status ?? 'confirmed', estimatedDelivery }
            : o,
        ),
      );
      this.message.set(`Order confirmed: ${CONFIRM_OUTCOME}.`);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Could not confirm order.');
    }
  }

  /** Mocks for the order endpoints when running against MockApiClient. */
  private registerMocks(): void {
    if (!(this.api instanceof MockApiClient)) return;
    const store: Order[] = [];
    this.api.registerMock('GET', '/api/orders', async () => [...store]);
    this.api.registerMock('POST', '/api/orders', async (body: any) => {
      const order: Order = {
        id: crypto.randomUUID(),
        status: 'pending',
        customerId: 'mock-customer',
        vendorId: body?.vendorId,
        items: body?.items ?? [],
      };
      store.unshift(order);
      return order;
    });
  }
}
