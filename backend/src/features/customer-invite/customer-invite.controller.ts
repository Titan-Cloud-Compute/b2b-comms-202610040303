import { Controller, NotImplementedException, UseGuards, Post, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { CustomerInviteService } from './customer-invite.service';

@ApiTags('customer-invite')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/customer-invite')
export class CustomerInviteController {
  constructor(private readonly customerinvite: CustomerInviteService) {}

  @Post('api/admin/customers/invite')
  async postApiAdminCustomersInvite() {
    throw new NotImplementedException();
  }

  @Get('api/admin/customers')
  async getApiAdminCustomers() {
    throw new NotImplementedException();
  }

}
