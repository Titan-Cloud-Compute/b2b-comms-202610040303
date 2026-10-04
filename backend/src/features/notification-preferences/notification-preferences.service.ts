import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { PutApiNotificationsPreferencesRequestDto, PutApiNotificationsPreferencesResponseDto, GetApiNotificationsPreferencesResponseDto } from './notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<GetApiNotificationsPreferencesResponseDto> {
    const row = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!row) {
      return { userId, orderAlerts: false, messageAlerts: false };
    }
    return { userId: row.userId, orderAlerts: row.orderAlerts, messageAlerts: row.messageAlerts };
  }

  async update(userId: string, dto: PutApiNotificationsPreferencesRequestDto): Promise<PutApiNotificationsPreferencesResponseDto> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, orderAlerts: dto.orderAlerts, messageAlerts: dto.messageAlerts },
      update: { orderAlerts: dto.orderAlerts, messageAlerts: dto.messageAlerts },
    });
    return { userId: row.userId, orderAlerts: row.orderAlerts, messageAlerts: row.messageAlerts };
  }
}
