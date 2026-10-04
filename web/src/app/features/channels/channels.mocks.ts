import { MockApiClient } from '../../shared/api/api-client';

export interface Channel {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  body: string;
  channelId: string;
}

export function registerChannelMocks(client: MockApiClient): void {
  const channels: Channel[] = [];

  client.registerMock<Channel[]>('GET', '/api/channels', async () => [...channels]);

  client.registerMock<Channel>('POST', '/api/channels', async (body: any) => {
    const channel: Channel = {
      id: crypto.randomUUID(),
      name: body?.name ?? 'Unnamed',
    };
    channels.push(channel);
    return channel;
  });
}

export function registerChannelMessageMock(client: MockApiClient, channelId: string): void {
  client.registerMock<Message>('POST', `/api/channels/${channelId}/messages`, async (body: any) => ({
    id: crypto.randomUUID(),
    body: body?.body ?? '',
    channelId,
  }));
}
