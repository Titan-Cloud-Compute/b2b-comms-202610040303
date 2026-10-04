import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [],
  template: `
    <div data-testid="admin-customers-screen">
      <h1>Customer Management</h1>
      <p>customer list and invite form</p>
    </div>
  `,
})
export class AdminCustomersComponent {}
