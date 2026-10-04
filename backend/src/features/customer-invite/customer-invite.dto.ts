// CustomerInvite DTOs

export interface PostApiAdminCustomersInviteRequestDto {
  email: string;
}

export interface PostApiAdminCustomersInviteResponseDto {
  customerId: string;
  email: string;
  invitationSent: boolean;
}

export interface GetApiAdminCustomersRequestDto {
}

export interface GetApiAdminCustomersResponseDto {
  id: string;
  email: string;
}
