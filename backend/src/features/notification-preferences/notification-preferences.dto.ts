// NotificationPreferences DTOs

export interface PutApiNotificationsPreferencesRequestDto {
  orderAlerts: boolean;
  messageAlerts: boolean;
}

export interface PutApiNotificationsPreferencesResponseDto {
  userId: string;
  orderAlerts: boolean;
  messageAlerts: boolean;
}

export interface GetApiNotificationsPreferencesRequestDto {
}

export interface GetApiNotificationsPreferencesResponseDto {
  userId: string;
  orderAlerts: boolean;
  messageAlerts: boolean;
}
