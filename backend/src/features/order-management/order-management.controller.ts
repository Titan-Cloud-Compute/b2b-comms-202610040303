import { Controller, NotImplementedException, UseGuards, Post, Patch, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { OrderManagementService } from './order-management.service';

@ApiTags('order-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('api/order-management')
export class OrderManagementController {
  constructor(private readonly ordermanagement: OrderManagementService) {}

  @Post('api/orders')
  async postApiOrders() {
    throw new NotImplementedException();
  }

  @Patch('api/orders/:id/confirm')
  async patchApiOrders:idConfirm() {
    throw new NotImplementedException();
  }

  @Get('api/orders')
  async getApiOrders() {
    throw new NotImplementedException();
  }

}
