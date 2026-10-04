// AUTO-GENERATED — do not edit by hand

export interface GetApiAdminAuditLogResponse {
  action: string;
  createdAt: string;
  id: string;
  userId: string;
}

export interface GetApiAdminCustomersResponse {
  email: string;
  id: string;
}

export interface GetApiChannelsResponse {
  id: string;
  name: string;
}

export interface GetApiInvoicesByIdDownloadResponse {
  downloadUrl: string;
  id: string;
}

export interface GetApiNotificationsPreferencesResponse {
  messageAlerts: boolean;
  orderAlerts: boolean;
  userId: string;
}

export interface GetApiOrdersResponse {
  id: string;
  status: string;
}

export interface GetApiVendorDocumentsResponse {
  filename: string;
  id: string;
  status: string;
}

export interface PatchApiOrdersByIdConfirmRequest {
  estimatedDelivery: string;
}

export interface PatchApiOrdersByIdConfirmResponse {
  id: string;
  status: string;
}

export interface PostApiAdminAuditLogRequest {
  action: string;
  userId: string;
}

export interface PostApiAdminAuditLogResponse {
  action: string;
  createdAt: string;
  id: string;
}

export interface PostApiAdminCustomersInviteRequest {
  email: string;
}

export interface PostApiAdminCustomersInviteResponse {
  customerId: string;
  email: string;
  invitationSent: boolean;
}

export interface PostApiChannelsRequest {
  name: string;
}

export interface PostApiChannelsResponse {
  id: string;
  name: string;
}

export interface PostApiChannelsByIdMessagesRequest {
  body: string;
}

export interface PostApiChannelsByIdMessagesResponse {
  body: string;
  channelId: string;
  id: string;
}

export interface PostApiInvoicesRequest {
  amount: string;
  orderId: string;
}

export interface PostApiInvoicesResponse {
  amount: string;
  id: string;
  orderId: string;
}

export interface PostApiOrdersRequest {
  vendorId: string;
}

export interface PostApiOrdersResponse {
  customerId: string;
  id: string;
  status: string;
}

export interface PostApiVendorDocumentsRequest {
  filename: string;
}

export interface PostApiVendorDocumentsResponse {
  filename: string;
  id: string;
  status: string;
}

export interface PostApiVendorProfileRequest {
  companyName: string;
  contactEmail: string;
}

export interface PostApiVendorProfileResponse {
  companyName: string;
  contactEmail: string;
  id: string;
}

export interface PutApiNotificationsPreferencesRequest {
  messageAlerts: boolean;
  orderAlerts: boolean;
}

export interface PutApiNotificationsPreferencesResponse {
  messageAlerts: boolean;
  orderAlerts: boolean;
  userId: string;
}
