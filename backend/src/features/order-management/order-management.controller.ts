import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { OrderManagementService } from './order-management.service';
import { createOrderSchema, confirmOrderSchema } from './order-management.dto';

@ApiTags('order-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/orders')
export class OrderManagementController {
  constructor(private readonly orderManagement: OrderManagementService) {}

  @Post()
  @HttpCode(201)
  @Roles(UserRole.CUSTOMER)
  async create(@Req() req: Request, @Body() body: unknown) {
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.orderManagement.createOrder(req.session!, parsed.data);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.VENDOR)
  async confirm(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const parsed = confirmOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }
    return this.orderManagement.confirmOrder(req.session!, id, parsed.data);
  }

  @Get()
  @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.ADMIN)
  async list(@Req() req: Request) {
    return this.orderManagement.listOrders(req.session!);
  }
}
