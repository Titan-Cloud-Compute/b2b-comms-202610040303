import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiClient, ForbiddenError } from '../../shared/api/api-client';
import { AuditEntry } from './audit-entry.types';
import { PageComponent } from '../../shared/layout/page.component';

@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [CommonModule, PageComponent],
  template: `
    <app-page heading="Audit Log">
    <div data-testid="admin-audit-log-screen">
      <ul data-testid="audit-log-help">
        <li>Viewing the log: a list of AuditEntry records is displayed in chronological order returns 200.</li>
        <li>Recording actions: the AuditEntry is stored and returns 201 with the created record.</li>
      </ul>

      @if (loading()) {
        <p role="status">Loading…</p>
      }

      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }

      @if (!loading() && !error()) {
        @if (entries().length === 0) {
          <p data-testid="audit-log-empty">No audit entries yet.</p>
        } @else {
          <table data-testid="audit-log-table">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Action</th>
                <th scope="col">User ID</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of entries(); track entry.id) {
                <tr data-testid="audit-log-row">
                  <td><time [dateTime]="entry.createdAt">{{ formatTime(entry.createdAt) }}</time></td>
                  <td>{{ entry.action }}</td>
                  <td>{{ entry.userId }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </div>
    </app-page>
  `,
})
export class AdminAuditLogComponent implements OnInit {
  private api = inject(ApiClient);

  entries = signal<AuditEntry[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const raw = await this.api.get<unknown[]>('/api/admin/audit-log');
      const valid = (Array.isArray(raw) ? raw : []).filter(
        (item): item is AuditEntry =>
          !!item &&
          typeof (item as any).id === 'string' &&
          typeof (item as any).action === 'string' &&
          typeof (item as any).userId === 'string' &&
          typeof (item as any).createdAt === 'string',
      );
      valid.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      this.entries.set(valid);
    } catch (err: unknown) {
      if (err instanceof ForbiddenError) {
        this.error.set('Only admins can view the audit log.');
      } else {
        this.error.set('Could not load the audit log.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
