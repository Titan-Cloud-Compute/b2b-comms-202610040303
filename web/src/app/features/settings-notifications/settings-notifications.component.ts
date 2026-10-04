import { Component } from '@angular/core';

@Component({
  selector: 'app-settings-notifications',
  standalone: true,
  imports: [],
  template: `
    <div data-testid="settings-notifications-screen">
      <h1>Notification Settings</h1>
      <p>notification preference controls</p>
    </div>
  `,
})
export class SettingsNotificationsComponent {}
