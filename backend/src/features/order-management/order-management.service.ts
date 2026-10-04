import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto, ConfirmOrderDto } from './order-management.dto';
import type { SessionPayload } from '../../auth/session.types';

@Injectable()
export class OrderManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, body: CreateOrderDto) {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) {
      throw new ForbiddenException('no customer profile for this user');
    }

    const order = await this.prisma.order.create({
      data: {
        status: 'pending',
        customerId: customer.id,
        vendorId: body.vendorId,
        orderItems: {
          create: body.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    });

    return { id: order.id, status: order.status, customerId: order.customerId };
  }

  async confirm(userId: string, orderId: string, body: ConfirmOrderDto) {
    const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) {
      throw new ForbiddenException('no vendor profile for this user');
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.vendorId !== vendor.id) {
      throw new NotFoundException('order not found');
    }
    if (order.status !== 'pending') {
      throw new ConflictException('order is already confirmed');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'confirmed' },
    });

    return {
      id: updated.id,
      status: updated.status,
      estimatedDelivery: body.estimatedDelivery,
    };
  }

  async list(session: SessionPayload) {
    const { userId, role } = session;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any = {};

    if (role === 'CUSTOMER') {
      const customer = await this.prisma.customer.findUnique({ where: { userId } });
      if (!customer) return [];
      where = { customerId: customer.id };
    } else if (role === 'VENDOR') {
      const vendor = await this.prisma.vendorProfile.findUnique({ where: { userId } });
      if (!vendor) return [];
      where = { vendorId: vendor.id };
    }
    // ADMIN: no filter — returns all orders

    const orders = await this.prisma.order.findMany({
      where,
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      id: o.id,
      status: o.status,
      customerId: o.customerId,
      vendorId: o.vendorId,
      createdAt: (o.createdAt as Date).toISOString(),
      items: (o.orderItems as Array<{
        id: string;
        description: string;
        quantity: number;
        unitPrice: number;
      }>).map((i) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    }));
  }
}
