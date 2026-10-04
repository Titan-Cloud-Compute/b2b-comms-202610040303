import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiClient, ApiError } from '../../shared/api/api-client';

interface CreateInvoiceRequest {
  orderId: string;
  amount: number;
}

interface Invoice {
  id: string;
  orderId: string;
  amount: number;
}

interface InvoiceDownload {
  id: string;
  downloadUrl: string;
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div data-testid="invoices-screen">
      <h1>Invoices</h1>

      <section data-testid="invoice-generate-form">
        <h2>Generate invoice</h2>
        <p>Pick a confirmed order and enter the amount — the invoice is created and returns 201 with the invoice id available for download.</p>
        <form (ngSubmit)="generateInvoice()">
          <div>
            <label for="invoice-order-id">Order ID</label>
            <input
              id="invoice-order-id"
              data-testid="invoice-order-id"
              type="text"
              [(ngModel)]="orderId"
              name="orderId"
              placeholder="Order UUID"
            />
          </div>
          <div>
            <label for="invoice-amount">Amount</label>
            <input
              id="invoice-amount"
              data-testid="invoice-amount"
              type="number"
              [(ngModel)]="amount"
              name="amount"
              step="0.01"
              min="0.01"
              placeholder="0.00"
            />
          </div>
          <button type="submit" [disabled]="generateBusy()">Generate invoice</button>
        </form>
        @if (createdInvoice()) {
          <p data-testid="invoice-created">Invoice {{ createdInvoice()!.id }} created</p>
        }
        @if (generateError()) {
          <p data-testid="invoice-error">{{ generateError() }}</p>
        }
      </section>

      <section data-testid="invoice-download-form">
        <h2>Download invoice</h2>
        <p>Request the link for an existing invoice — the response returns 200 with a downloadUrl pointing to the stored invoice.</p>
        <div>
          <label for="invoice-download-id">Invoice ID</label>
          <input
            id="invoice-download-id"
            data-testid="invoice-download-id"
            type="text"
            [(ngModel)]="downloadId"
            name="downloadId"
            placeholder="Invoice UUID"
          />
        </div>
        <button type="button" (click)="getDownloadLink()" [disabled]="downloadBusy()">Get download link</button>
        @if (downloadLink()) {
          <p>
            <a data-testid="invoice-download-link" [href]="downloadLink()!" target="_blank" rel="noopener">Download invoice</a>
          </p>
        }
        @if (downloadError()) {
          <p data-testid="invoice-error">{{ downloadError() }}</p>
        }
      </section>
    </div>
  `,
})
export class InvoicesComponent {
  private api = inject(ApiClient);

  orderId = '';
  amount: number | null = null;
  downloadId = '';

  generateBusy = signal(false);
  createdInvoice = signal<Invoice | null>(null);
  generateError = signal<string | null>(null);

  downloadBusy = signal(false);
  downloadLink = signal<string | null>(null);
  downloadError = signal<string | null>(null);

  async generateInvoice(): Promise<void> {
    if (!this.orderId.trim() || !this.amount || this.amount <= 0) return;
    this.generateBusy.set(true);
    this.createdInvoice.set(null);
    this.generateError.set(null);
    try {
      const invoice = await this.api.post<Invoice>('/api/invoices', {
        orderId: this.orderId.trim(),
        amount: this.amount,
      } as CreateInvoiceRequest);
      this.createdInvoice.set(invoice);
      this.downloadId = invoice.id;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        this.generateError.set('This order is not confirmed or already has an invoice');
      } else if (err instanceof ApiError) {
        this.generateError.set(err.message);
      } else {
        this.generateError.set('An unexpected error occurred');
      }
    } finally {
      this.generateBusy.set(false);
    }
  }

  async getDownloadLink(): Promise<void> {
    if (!this.downloadId.trim()) return;
    this.downloadBusy.set(true);
    this.downloadLink.set(null);
    this.downloadError.set(null);
    try {
      const result = await this.api.get<InvoiceDownload>(
        '/api/invoices/' + encodeURIComponent(this.downloadId.trim()) + '/download'
      );
      this.downloadLink.set(result.downloadUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        this.downloadError.set(err.message);
      } else {
        this.downloadError.set('An unexpected error occurred');
      }
    } finally {
      this.downloadBusy.set(false);
    }
  }
}
