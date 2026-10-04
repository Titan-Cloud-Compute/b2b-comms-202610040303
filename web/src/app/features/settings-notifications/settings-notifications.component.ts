import { Component, inject, signal, OnInit } from '@angular/core';
import { ApiClient } from '../../shared/api/api-client';
import { NotificationPreferences } from './notification-preferences.types';

@Component({
  selector: 'app-settings-notifications',
  standalone: true,
  imports: [],
  template: `
    <div data-testid="settings-notifications-screen">
      <h1>Notification Settings</h1>

      @if (loading()) {
        <p>Loading preferences…</p>
      } @else {
        <div>
          <label>
            <input
              type="checkbox"
              data-testid="order-alerts-toggle"
              [checked]="orderAlerts()"
              (change)="orderAlerts.set($any($event.target).checked)"
            />
            Order alerts
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              data-testid="message-alerts-toggle"
              [checked]="messageAlerts()"
              (change)="messageAlerts.set($any($event.target).checked)"
            />
            Message alerts
          </label>
        </div>

        <button type="button" (click)="turnOffAll()">Turn off all</button>

        <button
          type="button"
          data-testid="save-notification-preferences"
          [disabled]="saving()"
          (click)="save()"
        >
          Save
        </button>

        @if (status() === 'saved') {
          <p aria-live="polite" role="status">Preferences saved.</p>
        }
        @if (status() === 'error') {
          <p aria-live="polite" role="alert">Failed to save preferences.</p>
        }
      }

      <ul data-testid="notification-preferences-help">
        <li>Saving your choices: the preferences are updated and returns 200 with the stored NotificationPreference record.</li>
        <li>Turning everything off: the preferences are updated with both alert fields stored as false.</li>
      </ul>
    </div>
  `,
})
export class SettingsNotificationsComponent implements OnInit {
  private api = inject(ApiClient);

  loading = signal(true);
  saving = signal(false);
  orderAlerts = signal(false);
  messageAlerts = signal(false);
  status = signal<'idle' | 'saved' | 'error'>('idle');

  async ngOnInit(): Promise<void> {
    try {
      const prefs = await this.api.get<unknown>('/api/notifications/preferences');
      if (prefs && typeof prefs === 'object' && !Array.isArray(prefs)) {
        const p = prefs as Partial<NotificationPreferences>;
        this.orderAlerts.set(!!p.orderAlerts);
        this.messageAlerts.set(!!p.messageAlerts);
      }
    } catch {
      // fall back to defaults
    } finally {
      this.loading.set(false);
    }
  }

  turnOffAll(): void {
    this.orderAlerts.set(false);
    this.messageAlerts.set(false);
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.status.set('idle');
    try {
      const result = await this.api.request<unknown>('/api/notifications/preferences', {
        method: 'PUT',
        body: { orderAlerts: this.orderAlerts(), messageAlerts: this.messageAlerts() },
      });
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        const p = result as Partial<NotificationPreferences>;
        if (typeof p.orderAlerts === 'boolean') this.orderAlerts.set(p.orderAlerts);
        if (typeof p.messageAlerts === 'boolean') this.messageAlerts.set(p.messageAlerts);
      }
      this.status.set('saved');
    } catch {
      this.status.set('error');
    } finally {
      this.saving.set(false);
    }
  }
}
