import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { CustomerInviteService } from './customer-invite.service';

const InviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

@ApiTags('customer-invite')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/customers')
export class CustomerInviteController {
  constructor(private readonly customerInvite: CustomerInviteService) {}

  @Post('invite')
  @HttpCode(201)
  async postApiAdminCustomersInvite(@Body() body: unknown) {
    const parsed = InviteSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join('; '),
      );
    }
    return this.customerInvite.invite(parsed.data.email);
  }

  @Get()
  async getApiAdminCustomers() {
    return this.customerInvite.list();
  }
}
