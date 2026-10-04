import { Component } from '@angular/core';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [],
  template: `
    <div data-testid="invoices-screen">
      <h1>Invoices</h1>
      <p>invoice list and generator</p>
    </div>
  `,
})
export class InvoicesComponent {}
