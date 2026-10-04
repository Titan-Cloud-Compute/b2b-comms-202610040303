import { Component } from '@angular/core';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [],
  template: `
    <div data-testid="orders-screen">
      <h1>Orders</h1>
      <p>order list and purchase form</p>
    </div>
  `,
})
export class OrdersComponent {}
