import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateOrderDto,
  GetApiOrdersResponseItemDto,
  PatchApiOrdersConfirmResponseDto,
  PostApiOrdersResponseDto,
} from './order-management.dto';

@Injectable()
export class OrderManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: CreateOrderDto): Promise<PostApiOrdersResponseDto> {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new ForbiddenException('no customer profile for this user');

    const order = await this.prisma.order.create({
      data: {
        status: 'pending',
        customerId: customer.id,
        vendorId: data.vendorId,
        orderItems: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    });

    return { id: order.id, status: order.status, customerId: order.customerId };
  }

  async confirm(
    userId: string,
    orderId: string,
    estimatedDelivery: string,
  ): Promise<PatchApiOrdersConfirmResponseDto> {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendorProfile) throw new ForbiddenException('no vendor profile for this user');

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.vendorId !== vendorProfile.id) {
      throw new NotFoundException('order not found');
    }
    if (order.status !== 'pending') {
      throw new ConflictException('order is already confirmed');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'confirmed' },
    });

    return { id: updated.id, status: updated.status, estimatedDelivery };
  }

  async list(userId: string, role: UserRole | string): Promise<GetApiOrdersResponseItemDto[]> {
    let customerId: string | undefined;
    let vendorId: string | undefined;

    if (role === UserRole.CUSTOMER) {
      const customer = await this.prisma.customer.findUnique({ where: { userId } });
      if (!customer) return [];
      customerId = customer.id;
    } else if (role === UserRole.VENDOR) {
      const vendorProfile = await this.prisma.vendorProfile.findUnique({ where: { userId } });
      if (!vendorProfile) return [];
      vendorId = vendorProfile.id;
    }
    // ADMIN: no where filter → returns all orders

    const orders = await this.prisma.order.findMany({
      where: {
        ...(customerId !== undefined ? { customerId } : {}),
        ...(vendorId !== undefined ? { vendorId } : {}),
      },
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      id: o.id,
      status: o.status,
      customerId: o.customerId,
      vendorId: o.vendorId,
      createdAt: o.createdAt.toISOString(),
      items: o.orderItems.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    }));
  }
}
