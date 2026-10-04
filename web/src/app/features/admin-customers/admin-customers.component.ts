import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiClient, ConflictError, BadRequestError } from '../../shared/api/api-client';
import type { InviteCustomerResponse, CustomerListItem } from './customer-invite.types';
import { PageComponent } from '../../shared/layout/page.component';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageComponent],
  template: `
    <app-page heading="Customer Management">
    <div data-testid="admin-customers-screen">

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <label for="invite-email">Customer email</label>
        <input
          id="invite-email"
          type="email"
          data-testid="invite-email"
          formControlName="email"
          placeholder="customer@example.com"
        />
        <button
          type="submit"
          data-testid="invite-submit"
          [disabled]="form.invalid || loading()"
        >Send invitation</button>
      </form>

      @if (success()) {
        <p data-testid="invite-success" role="status">Invitation sent to {{ lastEmail() }}</p>
      }
      @if (error()) {
        <p data-testid="invite-error" role="alert">{{ error() }}</p>
      }

      <ul data-testid="customer-list">
        @if (customers().length === 0) {
          <li>No customers yet</li>
        }
        @for (c of customers(); track c.id) {
          <li data-testid="customer-row">{{ c.email }}</li>
        }
      </ul>

      <div data-testid="invite-rules">
        <ul>
          <li>When you invite a new email address, a Customer record is created and returns 201 with invitationSent true.</li>
          <li>If a customer with that email already exists, the response returns 409 error indicating the customer already exists.</li>
        </ul>
      </div>
    </div>
    </app-page>
  `,
})
export class AdminCustomersComponent implements OnInit {
  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  customers = signal<CustomerListItem[]>([]);
  loading = signal(false);
  success = signal(false);
  error = signal<string | null>(null);
  lastEmail = signal('');

  constructor(private api: ApiClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  private async loadCustomers(): Promise<void> {
    try {
      const result = await this.api.get<CustomerListItem[]>('/api/admin/customers');
      this.customers.set(Array.isArray(result) ? result : []);
    } catch {
      this.customers.set([]);
    }
    this.cdr.markForCheck();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    const email = this.form.value.email as string;
    this.loading.set(true);
    this.success.set(false);
    this.error.set(null);
    this.cdr.markForCheck();
    try {
      const res = await this.api.post<InviteCustomerResponse>('/api/admin/customers/invite', { email });
      if (res.invitationSent === true) {
        this.lastEmail.set(email);
        this.success.set(true);
        this.form.reset();
        this.cdr.markForCheck();
        await this.loadCustomers();
      }
    } catch (err) {
      if (err instanceof ConflictError) {
        this.error.set('A customer with this email already exists.');
      } else if (err instanceof BadRequestError) {
        this.error.set('Enter a valid email address.');
      } else {
        this.error.set('Could not send the invitation. Try again.');
      }
      this.cdr.markForCheck();
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }
}
