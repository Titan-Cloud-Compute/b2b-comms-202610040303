import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateOrderDto,
  ConfirmOrderDto,
  GetApiOrdersResponseItemDto,
  PostApiOrdersResponseDto,
  PatchApiOrdersConfirmResponseDto,
} from './order-management.dto';
import type { SessionPayload } from '../../auth/session.types';

@Injectable()
export class OrderManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(
    session: SessionPayload,
    dto: CreateOrderDto,
  ): Promise<PostApiOrdersResponseDto> {
    // Resolve the Customer record for this user
    const customer = await this.prisma.customer.findUnique({
      where: { userId: session.userId },
    });
    if (!customer) {
      throw new ForbiddenException('No customer profile found for this user');
    }

    const order = await this.prisma.order.create({
      data: {
        status: 'pending',
        customerId: customer.id,
        vendorId: dto.vendorId,
        orderItems: {
          create: dto.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    });

    return { id: order.id, status: order.status, customerId: order.customerId };
  }

  async confirmOrder(
    session: SessionPayload,
    orderId: string,
    dto: ConfirmOrderDto,
  ): Promise<PatchApiOrdersConfirmResponseDto> {
    // Resolve the VendorProfile for this user
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId: session.userId },
    });
    if (!vendorProfile) {
      throw new ForbiddenException('No vendor profile found for this user');
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.vendorId !== vendorProfile.id) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== 'pending') {
      throw new ConflictException('Order is already confirmed');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'confirmed' },
    });

    return {
      id: updated.id,
      status: updated.status,
      estimatedDelivery: dto.estimatedDelivery,
    };
  }

  async listOrders(session: SessionPayload): Promise<GetApiOrdersResponseItemDto[]> {
    let where: Record<string, string> | undefined;

    if (session.role === UserRole.CUSTOMER) {
      const customer = await this.prisma.customer.findUnique({
        where: { userId: session.userId },
      });
      if (!customer) return [];
      where = { customerId: customer.id };
    } else if (session.role === UserRole.VENDOR) {
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId: session.userId },
      });
      if (!vendorProfile) return [];
      where = { vendorId: vendorProfile.id };
    }
    // ADMIN: where = undefined → all orders

    const orders = await this.prisma.order.findMany({
      where,
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o: any) => ({
      id: o.id,
      status: o.status,
      customerId: o.customerId,
      vendorId: o.vendorId,
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
      items: (o.orderItems ?? []).map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    }));
  }
}
