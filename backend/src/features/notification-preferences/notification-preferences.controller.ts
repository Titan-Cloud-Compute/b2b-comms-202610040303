import { Controller, NotImplementedException, UseGuards, Put, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { NotificationPreferencesService } from './notification-preferences.service';

@ApiTags('notification-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER)
@Controller('api/notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly notificationpreferences: NotificationPreferencesService) {}

  @Put('api/notifications/preferences')
  async putApiNotificationsPreferences() {
    throw new NotImplementedException();
  }

  @Get('api/notifications/preferences')
  async getApiNotificationsPreferences() {
    throw new NotImplementedException();
  }

}
