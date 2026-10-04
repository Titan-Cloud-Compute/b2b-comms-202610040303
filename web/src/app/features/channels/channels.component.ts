import { Component } from '@angular/core';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [],
  template: `
    <div data-testid="channels-screen">
      <h1>Channels</h1>
      <p>list of shared communication channels</p>
    </div>
  `,
})
export class ChannelsComponent {}
