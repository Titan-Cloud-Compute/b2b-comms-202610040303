// SharedChannel DTOs

export interface PostApiChannelsRequestDto {
  name: string;
}

export interface PostApiChannelsResponseDto {
  id: string;
  name: string;
}

export interface PostApiChannelsMessagesRequestDto {
  body: string;
}

export interface PostApiChannelsMessagesResponseDto {
  id: string;
  body: string;
  channelId: string;
}

export interface GetApiChannelsRequestDto {
}

export interface GetApiChannelsResponseDto {
  id: string;
  name: string;
}
