// NotificationPreferences DTOs
import { z } from 'zod';

export const notificationPreferencesSchema = z
  .object({ orderAlerts: z.boolean(), messageAlerts: z.boolean() })
  .strict();

export interface PutApiNotificationsPreferencesRequestDto {
  orderAlerts: boolean;
  messageAlerts: boolean;
}

export interface PutApiNotificationsPreferencesResponseDto {
  userId: string;
  orderAlerts: boolean;
  messageAlerts: boolean;
}

export interface GetApiNotificationsPreferencesRequestDto {}

export interface GetApiNotificationsPreferencesResponseDto {
  userId: string;
  orderAlerts: boolean;
  messageAlerts: boolean;
}
