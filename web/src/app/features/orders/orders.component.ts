import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, ForbiddenError, ConflictError } from '../../shared/api/api-client';
import { OrderItemInput, OrderSummary } from './order.types';

interface LineItemForm {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div data-testid="orders-screen">
      <h1>Orders</h1>

      <section>
        <h2>Place a purchase order</h2>
        <form data-testid="order-create-form" (ngSubmit)="submitOrder()">
          <div>
            <label for="vendorId">Vendor ID</label>
            <input id="vendorId" name="vendorId" type="text" required [(ngModel)]="vendorId" />
          </div>

          <fieldset>
            <legend>Line Items</legend>
            @for (item of lineItems; track $index; let i = $index) {
              <div style="margin-bottom:8px;" [attr.data-testid]="'line-item-row-' + i">
                <input
                  [attr.name]="'desc-' + i"
                  [attr.data-testid]="'line-item-desc-' + i"
                  type="text"
                  placeholder="Description"
                  required
                  [(ngModel)]="item.description"
                  [ngModelOptions]="{standalone: true}"
                />
                <input
                  [attr.name]="'qty-' + i"
                  [attr.data-testid]="'line-item-qty-' + i"
                  type="number"
                  placeholder="Quantity"
                  min="1"
                  step="1"
                  required
                  [(ngModel)]="item.quantity"
                  [ngModelOptions]="{standalone: true}"
                />
                <input
                  [attr.name]="'price-' + i"
                  [attr.data-testid]="'line-item-price-' + i"
                  type="number"
                  placeholder="Unit Price"
                  min="0"
                  step="any"
                  required
                  [(ngModel)]="item.unitPrice"
                  [ngModelOptions]="{standalone: true}"
                />
                <button type="button" (click)="removeLineItem(i)">Remove</button>
              </div>
            }
            <button type="button" (click)="addLineItem()">Add line item</button>
          </fieldset>

          <button type="submit" [disabled]="submitting()">Place Order</button>
        </form>
      </section>

      @if (error()) {
        <p aria-live="polite" role="alert" data-testid="orders-error">{{ error() }}</p>
      }

      @if (orders().length === 0 && !loading()) {
        <p data-testid="orders-empty">No orders yet.</p>
      }

      @if (orders().length > 0) {
        <table data-testid="orders-list">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Vendor</th>
              <th scope="col">Items</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (order of orders(); track order.id) {
              <tr data-testid="order-row">
                <td>{{ order.id }}</td>
                <td>{{ order.vendorId ?? '—' }}</td>
                <td>{{ order.items?.length ?? 0 }}</td>
                <td><span data-testid="order-status">{{ order.status }}</span></td>
                <td>
                  @if (order.status === 'pending') {
                    <input
                      type="date"
                      [attr.name]="'delivery-' + order.id"
                      [attr.data-testid]="'order-delivery-' + order.id"
                      [min]="today"
                      [(ngModel)]="deliveryDates[order.id]"
                      [ngModelOptions]="{standalone: true}"
                    />
                    <button
                      type="button"
                      data-testid="order-confirm"
                      (click)="confirmOrder(order.id)"
                    >Confirm order</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }

      <ul data-testid="orders-help">
        <li>Placing an order: the order is stored with status "pending" and returns 201 with the created Order record.</li>
        <li>Vendor confirmation: the order is updated to status "confirmed" and displays to the customer as confirmed.</li>
      </ul>
    </div>
  `,
})
export class OrdersComponent implements OnInit {
  orders = signal<OrderSummary[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  submitting = signal(false);

  vendorId = '';
  lineItems: LineItemForm[] = [{ description: '', quantity: null, unitPrice: null }];
  deliveryDates: Record<string, string> = {};
  today = new Date().toISOString().split('T')[0];

  constructor(private api: ApiClient) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  async loadOrders(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.api.get<unknown[]>('/api/orders');
      const valid = (Array.isArray(data) ? data : []).filter(
        (o: any) => typeof o?.id === 'string' && typeof o?.status === 'string',
      ) as OrderSummary[];
      this.orders.set(valid);
    } catch (e: any) {
      this.error.set(this.friendlyError(e));
    } finally {
      this.loading.set(false);
    }
  }

  addLineItem(): void {
    this.lineItems.push({ description: '', quantity: null, unitPrice: null });
  }

  removeLineItem(index: number): void {
    this.lineItems.splice(index, 1);
  }

  async submitOrder(): Promise<void> {
    this.error.set(null);
    this.submitting.set(true);
    const items: OrderItemInput[] = this.lineItems.map(i => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
    }));
    try {
      await this.api.post('/api/orders', { vendorId: this.vendorId, items });
      this.vendorId = '';
      this.lineItems = [{ description: '', quantity: null, unitPrice: null }];
      await this.loadOrders();
    } catch (e: any) {
      this.error.set(this.friendlyError(e));
    } finally {
      this.submitting.set(false);
    }
  }

  async confirmOrder(id: string): Promise<void> {
    this.error.set(null);
    const estimatedDelivery = this.deliveryDates[id] ?? '';
    try {
      const result = await this.api.patch<OrderSummary>(`/api/orders/${id}/confirm`, { estimatedDelivery });
      // Optimistically update status from the returned value
      if (result && typeof result.status === 'string') {
        this.orders.update(list =>
          list.map(o => (o.id === id ? { ...o, status: result.status } : o)),
        );
      }
      await this.loadOrders();
    } catch (e: any) {
      this.error.set(this.friendlyError(e));
    }
  }

  private friendlyError(e: any): string {
    if (e instanceof ForbiddenError) return "You don't have permission for this action.";
    if (e instanceof ConflictError) return 'This order was already confirmed.';
    return 'Something went wrong. Please try again.';
  }
}
