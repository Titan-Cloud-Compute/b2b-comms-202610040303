import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient, MockApiClient } from '../../shared/api/api-client';
import { registerChannelMocks, registerChannelMessageMock } from './channels.mocks';
import type { Channel, Message } from './channels.mocks';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div data-testid="channels-screen">
      <h1>Shared channels</h1>

      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }

      <ul data-testid="channel-list">
        @for (ch of channels(); track ch.id) {
          <li>
            <button
              [attr.aria-pressed]="selectedId() === ch.id"
              (click)="selectChannel(ch.id)">
              {{ ch.name }}
            </button>
          </li>
        } @empty {
          <li>No channels yet.</li>
        }
      </ul>

      <form data-testid="create-channel-form" (ngSubmit)="createChannel()">
        <input
          name="channelName"
          [(ngModel)]="newName"
          placeholder="Channel name"
          required />
        <button type="submit">Create channel</button>
      </form>
      <p>When you create a channel, the channel is stored and displays in both the vendor and customer channel lists.</p>

      <form data-testid="message-form" (ngSubmit)="sendMessage()">
        <textarea
          name="messageBody"
          [(ngModel)]="messageBody"
          placeholder="Write a message…"></textarea>
        <button type="submit" [disabled]="!selectedId()">Send message</button>
      </form>
      <p>When you send, the message is stored and returns 201 with the created Message record.</p>

      @if (lastMessage()) {
        <div data-testid="last-message">{{ lastMessage()!.body }}</div>
      }
    </div>
  `,
})
export class ChannelsComponent implements OnInit {
  private readonly api = inject(ApiClient);

  channels = signal<Channel[]>([]);
  selectedId = signal<string | null>(null);
  newName = '';
  messageBody = '';
  error = signal<string | null>(null);
  lastMessage = signal<Message | null>(null);

  constructor() {
    if (this.api instanceof MockApiClient) {
      registerChannelMocks(this.api);
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      const list = await this.api.get<Channel[]>('/api/channels');
      this.channels.set(list ?? []);
    } catch (err: any) {
      this.error.set(err?.message ?? 'Failed to load channels');
      this.channels.set([]);
    }
  }

  selectChannel(id: string): void {
    this.selectedId.set(id);
  }

  async createChannel(): Promise<void> {
    if (!this.newName.trim()) return;
    try {
      const channel = await this.api.post<Channel>('/api/channels', { name: this.newName.trim() });
      if (this.api instanceof MockApiClient) {
        registerChannelMessageMock(this.api, channel.id);
      }
      this.channels.update(list => [...list, channel]);
      this.selectedId.set(channel.id);
      this.newName = '';
      this.error.set(null);
    } catch (err: any) {
      this.error.set(err?.message ?? 'Failed to create channel');
    }
  }

  async sendMessage(): Promise<void> {
    const id = this.selectedId();
    if (!id || !this.messageBody.trim()) return;
    try {
      const msg = await this.api.post<Message>(`/api/channels/${id}/messages`, { body: this.messageBody.trim() });
      this.lastMessage.set(msg);
      this.messageBody = '';
      this.error.set(null);
    } catch (err: any) {
      this.error.set(err?.message ?? 'Failed to send message');
    }
  }
}
