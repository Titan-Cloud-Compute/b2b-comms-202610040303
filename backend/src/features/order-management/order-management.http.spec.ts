/**
 * HTTP integration tests for OrderManagementController.
 *
 * Spins up a real NestJS application with:
 *   - an in-memory fake PrismaService
 *   - a mock JwtAuthGuard that sets req.session from a per-test variable
 *   - the real RolesGuard so role checks are exercised
 */

import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, CanActivate, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { OrderManagementController } from './order-management.controller';
import { OrderManagementService } from './order-management.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import type { SessionPayload } from '../../auth/session.types';
import { UserRole } from '@prisma/client';

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const CUSTOMERS = new Map<string, { id: string; userId: string; email: string }>([
  ['u-cust', { id: 'c1', userId: 'u-cust', email: 'buyer@corp.example.com' }],
]);

const VENDORS = new Map<
  string,
  { id: string; userId: string; companyName: string; contactEmail: string }
>([
  ['u-vend', { id: 'v1', userId: 'u-vend', companyName: 'Acme', contactEmail: 'vendor@acme.example.com' }],
  ['u-vend2', { id: 'v2', userId: 'u-vend2', companyName: 'Beta', contactEmail: 'vendor2@beta.example.com' }],
]);

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orderStore = new Map<string, any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const itemStore = new Map<string, any[]>();
let idCounter = 1;

function resetStore() {
  orderStore.clear();
  itemStore.clear();
  idCounter = 1;
}

const fakePrisma = {
  customer: {
    findUnique: jest.fn(({ where }: { where: { userId: string } }) => {
      return Promise.resolve(CUSTOMERS.get(where.userId) ?? null);
    }),
  },
  vendorProfile: {
    findUnique: jest.fn(({ where }: { where: { userId: string } }) => {
      return Promise.resolve(VENDORS.get(where.userId) ?? null);
    }),
  },
  order: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: jest.fn(({ data }: any) => {
      const id = `order-${idCounter++}`;
      const items = ((data.orderItems?.create as Array<{
        description: string;
        quantity: number;
        unitPrice: number;
      }>) ?? []).map((item) => ({
        id: `item-${idCounter++}`,
        orderId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      itemStore.set(id, items);
      const order = {
        id,
        status: data.status as string,
        customerId: data.customerId as string,
        vendorId: data.vendorId as string,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      orderStore.set(id, order);
      return Promise.resolve(order);
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany: jest.fn(({ where, include }: any) => {
      let result = [...orderStore.values()];
      if (where?.customerId) {
        result = result.filter((o) => o.customerId === where.customerId);
      }
      if (where?.vendorId) {
        result = result.filter((o) => o.vendorId === where.vendorId);
      }
      if (include?.orderItems) {
        result = result.map((o) => ({
          ...o,
          orderItems: itemStore.get(o.id) ?? [],
        }));
      }
      return Promise.resolve(result);
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique: jest.fn(({ where }: any) => {
      return Promise.resolve(orderStore.get(where.id) ?? null);
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: jest.fn(({ where, data }: any) => {
      const o = orderStore.get(where.id);
      if (!o) return Promise.resolve(null);
      const updated = { ...o, ...data };
      orderStore.set(where.id, updated);
      return Promise.resolve(updated);
    }),
  },
};

// ---------------------------------------------------------------------------
// Session control
// ---------------------------------------------------------------------------

let currentSession: SessionPayload | null = null;

const setSession = (userId: string, role: UserRole) => {
  currentSession = { userId, role, firmId: null };
};
const clearSession = () => {
  currentSession = null;
};

class MockJwtAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    if (!currentSession) throw new UnauthorizedException('not authenticated');
    ctx.switchToHttp().getRequest().session = currentSession;
    return true;
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('OrderManagementController (HTTP)', () => {
  let app: INestApplication;
  let orderId: string;

  beforeAll(async () => {
    resetStore();

    const moduleRef = await Test.createTestingModule({
      controllers: [OrderManagementController],
      providers: [
        OrderManagementService,
        { provide: PrismaService, useValue: fakePrisma },
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    clearSession();
    await app.close();
  });

  // -------------------------------------------------------------------------
  // Anonymous — 401 on all routes
  // -------------------------------------------------------------------------

  describe('anonymous requests → 401', () => {
    beforeEach(() => clearSession());

    it('POST /api/orders anonymous → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [] })
        .expect(401);
    });

    it('GET /api/orders anonymous → 401', async () => {
      await request(app.getHttpServer()).get('/api/orders').expect(401);
    });

    it('PATCH /api/orders/some-id/confirm anonymous → 401', async () => {
      await request(app.getHttpServer())
        .patch('/api/orders/some-id/confirm')
        .send({ estimatedDelivery: '2099-01-01' })
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/orders — role checks
  // -------------------------------------------------------------------------

  describe('POST /api/orders role checks', () => {
    it('POST as VENDOR → 403', async () => {
      setSession('u-vend', UserRole.VENDOR);
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [] })
        .expect(403);
    });

    it('POST as CUSTOMER with no Customer row → 403', async () => {
      setSession('u-no-profile', UserRole.CUSTOMER);
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [] })
        .expect(403);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/orders — validation
  // -------------------------------------------------------------------------

  describe('POST /api/orders validation → 400', () => {
    beforeEach(() => setSession('u-cust', UserRole.CUSTOMER));

    it('missing vendorId → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({ items: [] })
        .expect(400);
    });

    it('empty vendorId → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: '', items: [] })
        .expect(400);
    });

    it('items with quantity 0 → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          vendorId: 'v1',
          items: [{ description: 'Widget', quantity: 0, unitPrice: 9.5 }],
        })
        .expect(400);
    });

    it('items with negative unitPrice → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          vendorId: 'v1',
          items: [{ description: 'Widget', quantity: 1, unitPrice: -1 }],
        })
        .expect(400);
    });

    it('unknown keys in body → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({ vendorId: 'v1', items: [], unknownKey: 'bad' })
        .expect(400);
    });

    it('unknown keys in item → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          vendorId: 'v1',
          items: [{ description: 'Widget', quantity: 1, unitPrice: 9.5, extra: 'nope' }],
        })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/orders — happy path
  // -------------------------------------------------------------------------

  describe('POST /api/orders success', () => {
    it('creates order with items, returns 201 {id, status:pending, customerId}', async () => {
      setSession('u-cust', UserRole.CUSTOMER);

      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          vendorId: 'v1',
          items: [{ description: 'Widget', quantity: 2, unitPrice: 9.5 }],
        })
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        status: 'pending',
        customerId: 'c1',
      });

      orderId = res.body.id as string;

      // Verify store holds the order with one item
      const storedOrder = orderStore.get(orderId);
      expect(storedOrder).toBeDefined();
      expect(storedOrder.status).toBe('pending');
      expect(storedOrder.customerId).toBe('c1');
      expect(storedOrder.vendorId).toBe('v1');
      const storedItems = itemStore.get(orderId);
      expect(storedItems).toHaveLength(1);
      expect(storedItems![0].description).toBe('Widget');
      expect(storedItems![0].quantity).toBe(2);
      expect(storedItems![0].unitPrice).toBe(9.5);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/orders — scoped list
  // -------------------------------------------------------------------------

  describe('GET /api/orders scoped list', () => {
    it('customer sees their order with status pending', async () => {
      setSession('u-cust', UserRole.CUSTOMER);

      const res = await request(app.getHttpServer())
        .get('/api/orders')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = (res.body as Array<{ id: string; status: string }>)
        .find((o) => o.id === orderId);
      expect(found).toBeDefined();
      expect(found!.status).toBe('pending');
    });

    it('owning vendor sees the order', async () => {
      setSession('u-vend', UserRole.VENDOR);

      const res = await request(app.getHttpServer())
        .get('/api/orders')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = (res.body as Array<{ id: string }>)
        .find((o) => o.id === orderId);
      expect(found).toBeDefined();
    });

    it('other vendor does NOT see the order', async () => {
      setSession('u-vend2', UserRole.VENDOR);

      const res = await request(app.getHttpServer())
        .get('/api/orders')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = (res.body as Array<{ id: string }>)
        .find((o) => o.id === orderId);
      expect(found).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/orders/:id/confirm — role checks
  // -------------------------------------------------------------------------

  describe('PATCH /api/orders/:id/confirm role checks', () => {
    it('CUSTOMER → 403', async () => {
      setSession('u-cust', UserRole.CUSTOMER);
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: '2099-01-01' })
        .expect(403);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/orders/:id/confirm — validation
  // -------------------------------------------------------------------------

  describe('PATCH /api/orders/:id/confirm validation → 400', () => {
    beforeEach(() => setSession('u-vend', UserRole.VENDOR));

    it('missing estimatedDelivery → 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({})
        .expect(400);
    });

    it('unparseable estimatedDelivery → 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: 'not-a-date' })
        .expect(400);
    });

    it('estimatedDelivery in the past → 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: '2020-01-01' })
        .expect(400);
    });

    it('unknown keys → 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: '2099-01-01', extra: 'nope' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/orders/:id/confirm — object-level authorization
  // -------------------------------------------------------------------------

  describe('PATCH /api/orders/:id/confirm authorization', () => {
    it('other vendor → 404', async () => {
      setSession('u-vend2', UserRole.VENDOR);
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: '2099-01-01' })
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/orders/:id/confirm — happy path + idempotency
  // -------------------------------------------------------------------------

  describe('PATCH /api/orders/:id/confirm success', () => {
    it('owning vendor confirms order → 200 {id, status:confirmed}', async () => {
      setSession('u-vend', UserRole.VENDOR);

      const res = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: '2099-01-01' })
        .expect(200);

      expect(res.body).toMatchObject({ id: orderId, status: 'confirmed' });
    });

    it('customer now sees status confirmed', async () => {
      setSession('u-cust', UserRole.CUSTOMER);

      const res = await request(app.getHttpServer())
        .get('/api/orders')
        .expect(200);

      const found = (res.body as Array<{ id: string; status: string }>)
        .find((o) => o.id === orderId);
      expect(found).toBeDefined();
      expect(found!.status).toBe('confirmed');
    });

    it('second confirm attempt → 409', async () => {
      setSession('u-vend', UserRole.VENDOR);

      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/confirm`)
        .send({ estimatedDelivery: '2099-01-01' })
        .expect(409);
    });
  });
});
