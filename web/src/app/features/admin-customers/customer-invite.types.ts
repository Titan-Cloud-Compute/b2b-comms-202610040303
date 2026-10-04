export interface InviteCustomerRequest {
  email: string;
}

export interface InviteCustomerResponse {
  customerId: string;
  email: string;
  invitationSent: boolean;
}

export interface CustomerListItem {
  id: string;
  email: string;
}
