// SharedChannel DTOs

export interface CreateChannelRequestDto {
  name: string;
}

export interface ChannelResponseDto {
  id: string;
  name: string;
}

export interface CreateMessageRequestDto {
  body: string;
}

export interface MessageResponseDto {
  id: string;
  body: string;
  channelId: string;
}
