import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { notificationPreferencesSchema } from './notification-preferences.dto';
import { NotificationPreferencesService } from './notification-preferences.service';

@ApiTags('notification-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.MANAGER, UserRole.ADMIN, UserRole.VENDOR, UserRole.CUSTOMER)
@Controller('api/notifications')
export class NotificationPreferencesController {
  constructor(private readonly notificationpreferences: NotificationPreferencesService) {}

  @Get('preferences')
  async getPreferences(@Req() req: Request) {
    const userId = req.session!.userId;
    return this.notificationpreferences.get(userId);
  }

  @Put('preferences')
  @HttpCode(200)
  async putPreferences(@Req() req: Request, @Body() body: unknown) {
    const result = notificationPreferencesSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    const userId = req.session!.userId;
    return this.notificationpreferences.update(userId, result.data);
  }
}
