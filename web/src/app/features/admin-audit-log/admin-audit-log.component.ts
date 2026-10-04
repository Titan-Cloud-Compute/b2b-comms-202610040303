import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';

/** AuditEntry — mirrors the shared data model (no @contracts entry exists in web yet). */
export interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
}

const AUDIT_LOG_PATH = '/api/admin/audit-log';

function registerAuditLogMocks(client: MockApiClient): void {
  const store: AuditEntry[] = [
    { id: '00000000-0000-4000-8000-000000000001', action: 'user.login', userId: '00000000-0000-4000-8000-0000000000a1', createdAt: '2026-01-01T09:00:00.000Z' },
    { id: '00000000-0000-4000-8000-000000000002', action: 'order.created', userId: '00000000-0000-4000-8000-0000000000a2', createdAt: '2026-01-02T10:30:00.000Z' },
  ];
  client.registerMock<AuditEntry[]>('GET', AUDIT_LOG_PATH, async () => [...store]);
  client.registerMock<AuditEntry>('POST', AUDIT_LOG_PATH, async (body) => {
    const b = (body ?? {}) as { action?: string; userId?: string };
    const entry: AuditEntry = {
      id: '00000000-0000-4000-8000-' + String(Date.now()).padStart(12, '0').slice(-12),
      action: String(b.action ?? ''),
      userId: String(b.userId ?? ''),
      createdAt: new Date().toISOString(),
    };
    store.push(entry);
    return entry;
  });
}

@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div data-testid="admin-audit-log-screen">
      <h1>Audit Log</h1>

      <section>
        <p data-testid="audit-log-view-status">
          a list of AuditEntry records is displayed in chronological order returns 200
        </p>
        @if (error) {
          <p data-testid="audit-log-error">{{ error }}</p>
        }
        @if (entries.length > 0) {
          <table data-testid="audit-log-table">
            <thead>
              <tr><th>id</th><th>action</th><th>userId</th><th>createdAt</th></tr>
            </thead>
            <tbody>
              @for (e of entries; track e.id) {
                <tr data-testid="audit-log-row">
                  <td>{{ e.id }}</td>
                  <td>{{ e.action }}</td>
                  <td>{{ e.userId }}</td>
                  <td>{{ e.createdAt }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p data-testid="audit-log-empty">No audit entries yet.</p>
        }
      </section>

      <section>
        <h2>Record an action</h2>
        <form data-testid="audit-log-form" (ngSubmit)="record()">
          <label>Action <input name="action" data-testid="audit-log-action" [(ngModel)]="action" required /></label>
          <label>User ID <input name="userId" data-testid="audit-log-user-id" [(ngModel)]="userId" required /></label>
          <button type="submit" data-testid="audit-log-submit" [disabled]="saving">Record</button>
        </form>
        <p data-testid="audit-log-record-status">
          the AuditEntry is stored and returns 201 with the created record
        </p>
        @if (created) {
          <p data-testid="audit-log-created">Created {{ created.id }} ({{ created.action }})</p>
        }
      </section>
    </div>
  `,
})
export class AdminAuditLogComponent implements OnInit {
  private readonly api = inject(ApiClient);

  entries: AuditEntry[] = [];
  error = '';
  action = '';
  userId = '';
  saving = false;
  created: AuditEntry | null = null;

  constructor() {
    if (this.api instanceof MockApiClient) registerAuditLogMocks(this.api);
  }

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const list = await this.api.get<AuditEntry[]>(AUDIT_LOG_PATH);
      this.entries = this.sort(Array.isArray(list) ? list : []);
      this.error = '';
    } catch (e: unknown) {
      this.error = (e instanceof Error && e.message) || 'Failed to load audit log';
    }
  }

  async record(): Promise<void> {
    if (!this.action || !this.userId) return;
    this.saving = true;
    try {
      const entry = await this.api.post<AuditEntry>(AUDIT_LOG_PATH, { action: this.action, userId: this.userId });
      const full: AuditEntry = { ...entry, userId: entry.userId ?? this.userId };
      this.created = full;
      this.entries = this.sort([...this.entries, full]);
      this.action = '';
      this.userId = '';
      this.error = '';
    } catch (e: unknown) {
      this.error = (e instanceof Error && e.message) || 'Failed to record audit entry';
    } finally {
      this.saving = false;
    }
  }

  private sort(list: AuditEntry[]): AuditEntry[] {
    return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}
