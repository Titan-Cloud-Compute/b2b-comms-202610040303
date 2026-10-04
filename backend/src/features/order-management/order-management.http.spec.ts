import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderManagementController } from './order-management.controller';
import { OrderManagementService } from './order-management.service';

const COOKIE_NAME = 'session';
const JWT_SECRET = 'test-secret';

function mintCookie(jwtService: JwtService, userId: string, role: string): string {
  const token = jwtService.sign({ userId, role, firmId: null });
  return `${COOKIE_NAME}=${token}`;
}

// ── in-memory data types ──────────────────────────────────────────────────────

interface FakeOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface FakeOrder {
  id: string;
  status: string;
  customerId: string;
  vendorId: string;
  createdAt: Date;
  orderItems: FakeOrderItem[];
}

// ── static seed data ──────────────────────────────────────────────────────────

const CUSTOMERS: Record<string, { id: string; email: string; userId: string } | undefined> = {
  'u-cust': { id: 'c1', email: 'buyer@corp.example.com', userId: 'u-cust' },
  // 'u-cust-none' intentionally absent → no Customer row
};

const VENDOR_PROFILES: Record<
  string,
  { id: string; companyName: string; contactEmail: string; userId: string } | undefined
> = {
  'u-vend': { id: 'v1', companyName: 'ACME', contactEmail: 'vendor@acme.example.com', userId: 'u-vend' },
  'u-vend2': { id: 'v2', companyName: 'Other Vendor', contactEmail: 'other@example.com', userId: 'u-vend2' },
};

// ── mutable store (reset in beforeEach) ───────────────────────────────────────

let orderStore: FakeOrder[] = [];
let orderIdCounter = 0;
let itemIdCounter = 0;

// ── mock PrismaService ────────────────────────────────────────────────────────

const mockPrisma = {
  customer: {
    findUnique: jest.fn(),
  },
  vendorProfile: {
    findUnique: jest.fn(),
  },
  order: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

function resetMocks(): void {
  orderStore = [];
  orderIdCounter = 0;
  itemIdCounter = 0;
  jest.clearAllMocks();

  mockPrisma.customer.findUnique.mockImplementation(
    ({ where }: { where: { userId?: string } }) =>
      Promise.resolve(where.userId !== undefined ? (CUSTOMERS[where.userId] ?? null) : null),
  );

  mockPrisma.vendorProfile.findUnique.mockImplementation(
    ({ where }: { where: { userId?: string } }) =>
      Promise.resolve(where.userId !== undefined ? (VENDOR_PROFILES[where.userId] ?? null) : null),
  );

  mockPrisma.order.create.mockImplementation(({ data }: { data: any }) => {
    const id = `order-${++orderIdCounter}`;
    const order: FakeOrder = {
      id,
      status: data.status as string,
      customerId: data.customerId as string,
      vendorId: data.vendorId as string,
      createdAt: new Date(),
      orderItems: ((data.orderItems?.create ?? []) as Array<{
        description: string;
        quantity: number;
        unitPrice: number;
      }>).map((item) => ({
        id: `item-${++itemIdCounter}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };
    orderStore.push(order);
    return Promise.resolve(order);
  });

  mockPrisma.order.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
    Promise.resolve(orderStore.find((o) => o.id === where.id) ?? null),
  );

  mockPrisma.order.findMany.mockImplementation(
    ({ where }: { where?: { customerId?: string; vendorId?: string } }) => {
      let results = [...orderStore];
      if (where?.customerId) results = results.filter((o) => o.customerId === where.customerId);
      if (where?.vendorId) results = results.filter((o) => o.vendorId === where.vendorId);
      return Promise.resolve(results);
    },
  );

  mockPrisma.order.update.mockImplementation(
    ({ where, data }: { where: { id: string }; data: any }) => {
      const order = orderStore.find((o) => o.id === where.id);
      if (!order) return Promise.resolve(null);
      Object.assign(order, data);
      return Promise.resolve({ ...order });
    },
  );
}

// ── test suite ────────────────────────────────────────────────────────────────

describe('OrderManagement HTTP', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: JWT_SECRET })],
      controllers: [OrderManagementController],
      providers: [
        OrderManagementService,
        JwtAuthGuard,
        RolesGuard,
        Reflector,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    await app.init();

    jwtService = module.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMocks();
  });

  // ── anonymous → 401 ────────────────────────────────────────────────────────

  it('POST 401 with no cookie', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .send({ vendorId: 'v1', items: [{ description: 'Widget', quantity: 1, unitPrice: 5 }] })
      .expect(401);
  });

  it('PATCH confirm 401 with no cookie', async () => {
    await request(app.getHttpServer())
      .patch('/api/orders/order-1/confirm')
      .send({ estimatedDelivery: '2030-01-01' })
      .expect(401);
  });

  it('GET 401 with no cookie', async () => {
    await request(app.getHttpServer()).get('/api/orders').expect(401);
  });

  // ── POST /api/orders ────────────────────────────────────────────────────────

  it('POST 201 CUSTOMER valid body → order stored with item', async () => {
    const cookie = mintCookie(jwtService, 'u-cust', 'CUSTOMER');
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({
        vendorId: 'v1',
        items: [{ description: 'Widget', quantity: 2, unitPrice: 9.5 }],
      })
      .expect(201);

    expect(res.body).toMatchObject({ id: expect.any(String), status: 'pending', customerId: 'c1' });
    expect(orderStore).toHaveLength(1);
    expect(orderStore[0].orderItems).toHaveLength(1);
    expect(orderStore[0].orderItems[0]).toMatchObject({
      description: 'Widget',
      quantity: 2,
      unitPrice: 9.5,
    });
  });

  it('POST 400 missing vendorId', async () => {
    const cookie = mintCookie(jwtService, 'u-cust', 'CUSTOMER');
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({ items: [{ description: 'Widget', quantity: 1, unitPrice: 5 }] })
      .expect(400);
  });

  it('POST 400 item quantity 0', async () => {
    const cookie = mintCookie(jwtService, 'u-cust', 'CUSTOMER');
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({ vendorId: 'v1', items: [{ description: 'Widget', quantity: 0, unitPrice: 5 }] })
      .expect(400);
  });

  it('POST 400 item negative unitPrice', async () => {
    const cookie = mintCookie(jwtService, 'u-cust', 'CUSTOMER');
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({ vendorId: 'v1', items: [{ description: 'Widget', quantity: 1, unitPrice: -1 }] })
      .expect(400);
  });

  it('POST 400 unknown key in body', async () => {
    const cookie = mintCookie(jwtService, 'u-cust', 'CUSTOMER');
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({
        vendorId: 'v1',
        items: [{ description: 'Widget', quantity: 1, unitPrice: 5 }],
        unexpectedKey: 'value',
      })
      .expect(400);
  });

  it('POST 403 VENDOR role cannot create order', async () => {
    const cookie = mintCookie(jwtService, 'u-vend', 'VENDOR');
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({ vendorId: 'v1', items: [{ description: 'Widget', quantity: 1, unitPrice: 5 }] })
      .expect(403);
  });

  it('POST 403 CUSTOMER with no Customer profile', async () => {
    const cookie = mintCookie(jwtService, 'u-cust-none', 'CUSTOMER');
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({ vendorId: 'v1', items: [{ description: 'Widget', quantity: 1, unitPrice: 5 }] })
      .expect(403);
  });

  // ── GET /api/orders ─────────────────────────────────────────────────────────

  it('GET 200 CUSTOMER sees only own orders', async () => {
    orderStore.push({
      id: 'order-seed-1',
      status: 'pending',
      customerId: 'c1',
      vendorId: 'v1',
      createdAt: new Date(),
      orderItems: [],
    });

    const cookie = mintCookie(jwtService, 'u-cust', 'CUSTOMER');
    const res = await request(app.getHttpServer())
      .get('/api/orders')
      .set('Cookie', cookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = (res.body as Array<{ id: string; status: string }>).find(
      (o) => o.id === 'order-seed-1',
    );
    expect(found).toBeDefined();
    expect(found?.status).toBe('pending');
  });

  it('GET 200 u-vend sees v1 orders', async () => {
    orderStore.push({
      id: 'order-seed-1',
      status: 'pending',
      customerId: 'c1',
      vendorId: 'v1',
      createdAt: new Date(),
      orderItems: [],
    });

    const cookie = mintCookie(jwtService, 'u-vend', 'VENDOR');
    const res = await request(app.getHttpServer())
      .get('/api/orders')
      .set('Cookie', cookie)
      .expect(200);

    expect(
      (res.body as Array<{ id: string }>).find((o) => o.id === 'order-seed-1'),
    ).toBeDefined();
  });

  it('GET 200 u-vend2 does not see v1 orders', async () => {
    orderStore.push({
      id: 'order-seed-1',
      status: 'pending',
      customerId: 'c1',
      vendorId: 'v1',
      createdAt: new Date(),
      orderItems: [],
    });

    const cookie = mintCookie(jwtService, 'u-vend2', 'VENDOR');
    const res = await request(app.getHttpServer())
      .get('/api/orders')
      .set('Cookie', cookie)
      .expect(200);

    expect(
      (res.body as Array<{ id: string }>).find((o) => o.id === 'order-seed-1'),
    ).toBeUndefined();
  });

  // ── PATCH /api/orders/:id/confirm ───────────────────────────────────────────

  const FUTURE_DATE = '2030-12-31';

  it('PATCH 200 u-vend confirms order → {id, status:confirmed, estimatedDelivery}', async () => {
    orderStore.push({
      id: 'order-seed-1',
      status: 'pending',
      customerId: 'c1',
      vendorId: 'v1',
      createdAt: new Date(),
      orderItems: [],
    });

    const cookie = mintCookie(jwtService, 'u-vend', 'VENDOR');
    const res = await request(app.getHttpServer())
      .patch('/api/orders/order-seed-1/confirm')
      .set('Cookie', cookie)
      .send({ estimatedDelivery: FUTURE_DATE })
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'order-seed-1',
      status: 'confirmed',
      estimatedDelivery: FUTURE_DATE,
    });
  });

  it('GET after confirm shows status confirmed', async () => {
    orderStore.push({
      id: 'order-seed-1',
      status: 'confirmed', // already confirmed in store
      customerId: 'c1',
      vendorId: 'v1',
      createdAt: new Date(),
      orderItems: [],
    });

    const cookie = mintCookie(jwtService, 'u-cust', 'CUSTOMER');
    const res = await request(app.getHttpServer())
      .get('/api/orders')
      .set('Cookie', cookie)
      .expect(200);

    const found = (res.body as Array<{ id: string; status: string }>).find(
      (o) => o.id === 'order-seed-1',
    );
    expect(found?.status).toBe('confirmed');
  });

  it('PATCH 409 second confirm attempt', async () => {
    orderStore.push({
      id: 'order-seed-1',
      status: 'confirmed',
      customerId: 'c1',
      vendorId: 'v1',
      createdAt: new Date(),
      orderItems: [],
    });

    const cookie = mintCookie(jwtService, 'u-vend', 'VENDOR');
    await request(app.getHttpServer())
      .patch('/api/orders/order-seed-1/confirm')
      .set('Cookie', cookie)
      .send({ estimatedDelivery: FUTURE_DATE })
      .expect(409);
  });

  it('PATCH 404 u-vend2 cannot confirm v1 order', async () => {
    orderStore.push({
      id: 'order-seed-1',
      status: 'pending',
      customerId: 'c1',
      vendorId: 'v1',
      createdAt: new Date(),
      orderItems: [],
    });

    const cookie = mintCookie(jwtService, 'u-vend2', 'VENDOR');
    await request(app.getHttpServer())
      .patch('/api/orders/order-seed-1/confirm')
      .set('Cookie', cookie)
      .send({ estimatedDelivery: FUTURE_DATE })
      .expect(404);
  });

  it('PATCH 403 CUSTOMER cannot confirm', async () => {
    const cookie = mintCookie(jwtService, 'u-cust', 'CUSTOMER');
    await request(app.getHttpServer())
      .patch('/api/orders/order-seed-1/confirm')
      .set('Cookie', cookie)
      .send({ estimatedDelivery: FUTURE_DATE })
      .expect(403);
  });

  it('PATCH 400 missing estimatedDelivery', async () => {
    orderStore.push({
      id: 'order-seed-1',
      status: 'pending',
      customerId: 'c1',
      vendorId: 'v1',
      createdAt: new Date(),
      orderItems: [],
    });

    const cookie = mintCookie(jwtService, 'u-vend', 'VENDOR');
    await request(app.getHttpServer())
      .patch('/api/orders/order-seed-1/confirm')
      .set('Cookie', cookie)
      .send({})
      .expect(400);
  });

  it('PATCH 400 unparseable estimatedDelivery', async () => {
    const cookie = mintCookie(jwtService, 'u-vend', 'VENDOR');
    await request(app.getHttpServer())
      .patch('/api/orders/order-seed-1/confirm')
      .set('Cookie', cookie)
      .send({ estimatedDelivery: 'not-a-date' })
      .expect(400);
  });

  it('PATCH 400 past estimatedDelivery', async () => {
    const cookie = mintCookie(jwtService, 'u-vend', 'VENDOR');
    await request(app.getHttpServer())
      .patch('/api/orders/order-seed-1/confirm')
      .set('Cookie', cookie)
      .send({ estimatedDelivery: '2000-01-01' })
      .expect(400);
  });
});
