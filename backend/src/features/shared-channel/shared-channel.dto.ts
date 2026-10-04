// SharedChannel DTOs

export interface CreateChannelRequestDto {
  name: string;
}

export interface CreateChannelResponseDto {
  id: string;
  name: string;
}

export interface CreateMessageRequestDto {
  body: string;
}

export interface CreateMessageResponseDto {
  id: string;
  body: string;
  channelId: string;
}

export interface ListChannelsResponseDto {
  id: string;
  name: string;
}
