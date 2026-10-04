import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [],
  template: `
    <div data-testid="admin-audit-log-screen">
      <h1>Audit Log</h1>
      <p>chronological event log table</p>
    </div>
  `,
})
export class AdminAuditLogComponent {}
