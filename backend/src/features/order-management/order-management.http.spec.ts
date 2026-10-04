/**
 * HTTP integration spec for OrderManagementController
 * Wires controller + service against an in-memory Prisma mock.
 * Asserts all scenarios from the brief.
 */

import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { RolesGuard } from '../../auth/roles.guard';
import { OrderManagementController } from './order-management.controller';
import { OrderManagementService } from './order-management.service';
import { PrismaService } from '../../prisma/prisma.service';

// ────────────────────────────────────────────────────────────
// In-memory store
// ────────────────────────────────────────────────────────────
function buildPrismaMock() {
  // Seeded records
  const customers: Record<string, any> = {
    'u-cust': { id: 'c1', email: 'buyer@corp.example.com', userId: 'u-cust' },
  };
  const vendorProfiles: Record<string, any> = {
    'u-vend': { id: 'v1', companyName: 'Acme', contactEmail: 'vendor@acme.example.com', userId: 'u-vend' },
    'u-vend2': { id: 'v2', companyName: 'Other', contactEmail: 'other@other.example.com', userId: 'u-vend2' },
  };
  const orders: Map<string, any> = new Map();
  const orderItems: Map<string, any[]> = new Map();
  let orderSeq = 0;
  let itemSeq = 0;

  const mock = {
    customer: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.userId) return customers[where.userId] ?? null;
        return null;
      }),
    },
    vendorProfile: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.userId) return vendorProfiles[where.userId] ?? null;
        return null;
      }),
    },
    order: {
      create: jest.fn(async ({ data }: any) => {
        const id = `ord-${++orderSeq}`;
        const createdOrder = {
          id,
          status: data.status,
          customerId: data.customerId,
          vendorId: data.vendorId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        orders.set(id, createdOrder);
        // Handle nested orderItems.create
        const items: any[] = [];
        if (data.orderItems?.create) {
          const itemsData = Array.isArray(data.orderItems.create)
            ? data.orderItems.create
            : [data.orderItems.create];
          for (const itemData of itemsData) {
            const item = { id: `item-${++itemSeq}`, orderId: id, ...itemData };
            items.push(item);
          }
        }
        orderItems.set(id, items);
        return createdOrder;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        return orders.get(where.id) ?? null;
      }),
      findMany: jest.fn(async ({ where, include, orderBy }: any) => {
        let result = Array.from(orders.values());
        if (where?.customerId) {
          result = result.filter((o) => o.customerId === where.customerId);
        }
        if (where?.vendorId) {
          result = result.filter((o) => o.vendorId === where.vendorId);
        }
        if (include?.orderItems) {
          result = result.map((o) => ({ ...o, orderItems: orderItems.get(o.id) ?? [] }));
        }
        // Sort by createdAt desc
        result.sort((a, b) => b.createdAt - a.createdAt);
        return result;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const order = orders.get(where.id);
        if (!order) throw new Error('order not found');
        const updated = { ...order, ...data };
        orders.set(where.id, updated);
        return updated;
      }),
    },
    _reset() {
      orders.clear();
      orderItems.clear();
      orderSeq = 0;
      itemSeq = 0;
      jest.clearAllMocks();
    },
  };

  return mock;
}

// ────────────────────────────────────────────────────────────
// Auth guard factory
// ────────────────────────────────────────────────────────────
type Session = { userId: string; role: string };

function makeAuthGuard(session: Session | null): CanActivate {
  return {
    canActivate(ctx: ExecutionContext) {
      if (session === null) throw new UnauthorizedException('not authenticated');
      const req = ctx.switchToHttp().getRequest();
      req.session = session;
      return true;
    },
  };
}

// ────────────────────────────────────────────────────────────
// App factory
// ────────────────────────────────────────────────────────────
async function buildApp(
  prismaMock: ReturnType<typeof buildPrismaMock>,
  session: Session | null,
): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [OrderManagementController],
    providers: [
      OrderManagementService,
      { provide: PrismaService, useValue: prismaMock },
      Reflector,
    ],
  })
    .overrideGuard(require('../../auth/jwt-auth.guard').JwtAuthGuard)
    .useValue(makeAuthGuard(session))
    .compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────
describe('OrderManagementController (HTTP)', () => {
  let prismaMock: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prismaMock = buildPrismaMock();
  });

  // ─── POST /api/orders ────────────────────────────────────

  describe('POST /api/orders', () => {
    it('201 with {id, status:pending, customerId} for valid CUSTOMER request', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-cust', role: 'CUSTOMER' });
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [{ description: 'Widget', quantity: 2, unitPrice: 9.5 }] });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ status: 'pending', customerId: 'c1' });
      expect(typeof res.body.id).toBe('string');

      // Verify item stored
      expect(prismaMock.order.create).toHaveBeenCalledTimes(1);
      const createCall = (prismaMock.order.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.orderItems.create).toHaveLength(1);
      expect(createCall.data.orderItems.create[0]).toMatchObject({
        description: 'Widget',
        quantity: 2,
        unitPrice: 9.5,
      });

      await app.close();
    });

    it('400 when vendorId is missing', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-cust', role: 'CUSTOMER' });
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({ items: [{ description: 'Widget', quantity: 1, unitPrice: 5 }] });
      expect(res.status).toBe(400);
      await app.close();
    });

    it('400 when quantity is 0', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-cust', role: 'CUSTOMER' });
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [{ description: 'Widget', quantity: 0, unitPrice: 5 }] });
      expect(res.status).toBe(400);
      await app.close();
    });

    it('400 when unitPrice is negative', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-cust', role: 'CUSTOMER' });
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [{ description: 'Widget', quantity: 1, unitPrice: -1 }] });
      expect(res.status).toBe(400);
      await app.close();
    });

    it('400 when unknown keys are sent', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-cust', role: 'CUSTOMER' });
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [], unexpectedKey: 'bad' });
      expect(res.status).toBe(400);
      await app.close();
    });

    it('403 when called as VENDOR role', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-vend', role: 'VENDOR' });
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [] });
      expect(res.status).toBe(403);
      await app.close();
    });

    it('403 when CUSTOMER role but no Customer row', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-no-customer', role: 'CUSTOMER' });
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [] });
      expect(res.status).toBe(403);
      await app.close();
    });

    it('401 when unauthenticated', async () => {
      const app = await buildApp(prismaMock, null);
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [] });
      expect(res.status).toBe(401);
      await app.close();
    });
  });

  // ─── GET /api/orders ─────────────────────────────────────

  describe('GET /api/orders', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create an order as customer
      const app = await buildApp(prismaMock, { userId: 'u-cust', role: 'CUSTOMER' });
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [{ description: 'Widget', quantity: 2, unitPrice: 9.5 }] });
      orderId = res.body.id;
      await app.close();
    });

    it('200 list containing the order for the customer', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-cust', role: 'CUSTOMER' });
      const res = await request(app.getHttpServer()).get('/api/orders');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((o: any) => o.id === orderId);
      expect(found).toBeDefined();
      expect(found.status).toBe('pending');
      await app.close();
    });

    it('200 list containing the order for the owning vendor (u-vend)', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-vend', role: 'VENDOR' });
      const res = await request(app.getHttpServer()).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.find((o: any) => o.id === orderId)).toBeDefined();
      await app.close();
    });

    it('200 empty list for a different vendor (u-vend2)', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-vend2', role: 'VENDOR' });
      const res = await request(app.getHttpServer()).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.find((o: any) => o.id === orderId)).toBeUndefined();
      await app.close();
    });

    it('401 when unauthenticated', async () => {
      const app = await buildApp(prismaMock, null);
      const res = await request(app.getHttpServer()).get('/api/orders');
      expect(res.status).toBe(401);
      await app.close();
    });
  });

  // ─── PATCH /api/orders/:id/confirm ───────────────────────

  describe('PATCH /api/orders/:id/confirm', () => {
    let orderId: string;

    // Use a date definitely in the future
    const futureDate = '2099-12-31';

    beforeEach(async () => {
      const app = await buildApp(prismaMock, { userId: 'u-cust', role: 'CUSTOMER' });
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [{ description: 'Widget', quantity: 1, unitPrice: 10 }] });
      orderId = res.body.id;
      await app.close();
    });

    it('200 {id, status:confirmed, estimatedDelivery} for valid VENDOR confirm', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-vend', role: 'VENDOR' });
      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: futureDate });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: orderId, status: 'confirmed', estimatedDelivery: futureDate });
      await app.close();
    });

    it('GET after confirm shows status confirmed for customer', async () => {
      const vendorApp = await buildApp(prismaMock, { userId: 'u-vend', role: 'VENDOR' });
      await request(vendorApp.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: futureDate });
      await vendorApp.close();

      const custApp = await buildApp(prismaMock, { userId: 'u-cust', role: 'CUSTOMER' });
      const res = await request(custApp.getHttpServer()).get('/api/orders');
      expect(res.body.find((o: any) => o.id === orderId)?.status).toBe('confirmed');
      await custApp.close();
    });

    it('409 on second confirm attempt', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-vend', role: 'VENDOR' });
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: futureDate });
      const res2 = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: futureDate });
      expect(res2.status).toBe(409);
      await app.close();
    });

    it('404 when different vendor tries to confirm', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-vend2', role: 'VENDOR' });
      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: futureDate });
      expect(res.status).toBe(404);
      await app.close();
    });

    it('403 when CUSTOMER tries to confirm', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-cust', role: 'CUSTOMER' });
      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: futureDate });
      expect(res.status).toBe(403);
      await app.close();
    });

    it('400 when estimatedDelivery is missing', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-vend', role: 'VENDOR' });
      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({});
      expect(res.status).toBe(400);
      await app.close();
    });

    it('400 when estimatedDelivery is unparseable', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-vend', role: 'VENDOR' });
      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: 'not-a-date' });
      expect(res.status).toBe(400);
      await app.close();
    });

    it('400 when estimatedDelivery is in the past', async () => {
      const app = await buildApp(prismaMock, { userId: 'u-vend', role: 'VENDOR' });
      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: '2000-01-01' });
      expect(res.status).toBe(400);
      await app.close();
    });

    it('401 when unauthenticated', async () => {
      const app = await buildApp(prismaMock, null);
      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: futureDate });
      expect(res.status).toBe(401);
      await app.close();
    });
  });
});
