import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerInviteController } from './customer-invite.controller';
import { CustomerInviteService } from './customer-invite.service';

const COOKIE_NAME = 'session';
const JWT_SECRET = 'test-secret';

function mintCookie(jwtService: JwtService, role: string): string {
  const token = jwtService.sign({ userId: 'u1', role, firmId: null });
  return `${COOKIE_NAME}=${token}`;
}

describe('CustomerInvite HTTP', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  // tx mock — individual jest.fn() so tests can override per case
  const tx = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockPrisma = {
    runAsAdmin: jest.fn((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx)),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: JWT_SECRET })],
      controllers: [CustomerInviteController],
      providers: [
        CustomerInviteService,
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
    jest.clearAllMocks();
    mockPrisma.runAsAdmin.mockImplementation(
      (fn: (tx: typeof tx) => Promise<unknown>) => fn(tx),
    );
    tx.user.findUnique.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({ id: 'u-new', email: 'new@corp.example.com' });
    tx.customer.findUnique.mockResolvedValue(null);
    tx.customer.create.mockResolvedValue({
      id: 'c1',
      email: 'new@corp.example.com',
      createdAt: new Date(),
    });
    tx.customer.findMany.mockResolvedValue([{ id: 'c1', email: 'a@b.c' }]);
  });

  // ── POST /api/admin/customers/invite ─────────────────────────────────────

  it('401 with no cookie', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/customers/invite')
      .send({ email: 'x@example.com' })
      .expect(401);
  });

  it('403 for a USER cookie', async () => {
    const cookie = mintCookie(jwtService, 'USER');
    await request(app.getHttpServer())
      .post('/api/admin/customers/invite')
      .set('Cookie', cookie)
      .send({ email: 'x@example.com' })
      .expect(403);
  });

  it('400 for an invalid email', async () => {
    const cookie = mintCookie(jwtService, 'ADMIN');
    await request(app.getHttpServer())
      .post('/api/admin/customers/invite')
      .set('Cookie', cookie)
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('201 with correct body for a new email (ADMIN)', async () => {
    tx.customer.create.mockResolvedValue({
      id: 'c1',
      email: 'new@corp.example.com',
      createdAt: new Date(),
    });
    tx.user.create.mockResolvedValue({ id: 'u-new', email: 'new@corp.example.com' });

    const cookie = mintCookie(jwtService, 'ADMIN');
    const res = await request(app.getHttpServer())
      .post('/api/admin/customers/invite')
      .set('Cookie', cookie)
      .send({ email: 'New@Corp.example.com' }) // mixed case — should be lowercased
      .expect(201);

    expect(res.body).toEqual({
      customerId: 'c1',
      email: 'new@corp.example.com',
      invitationSent: true,
    });
    // user.create called with CUSTOMER role and lowercased email
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'CUSTOMER', email: 'new@corp.example.com' }),
      }),
    );
    // customer.create called with the userId from user.create
    expect(tx.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u-new' }),
      }),
    );
  });

  it('409 when customer.findUnique resolves a row', async () => {
    tx.customer.findUnique.mockResolvedValue({ id: 'c-existing' });

    const cookie = mintCookie(jwtService, 'ADMIN');
    const res = await request(app.getHttpServer())
      .post('/api/admin/customers/invite')
      .set('Cookie', cookie)
      .send({ email: 'existing@example.com' })
      .expect(409);

    expect(res.body.message).toMatch(/already exists/i);
  });

  it('409 when user.findUnique resolves a row', async () => {
    tx.user.findUnique.mockResolvedValue({ id: 'u-existing' });

    const cookie = mintCookie(jwtService, 'ADMIN');
    const res = await request(app.getHttpServer())
      .post('/api/admin/customers/invite')
      .set('Cookie', cookie)
      .send({ email: 'existing@example.com' })
      .expect(409);

    expect(res.body.message).toMatch(/already exists/i);
  });

  it('409 when customer.create throws P2002', async () => {
    tx.customer.findUnique.mockResolvedValue(null);
    tx.user.findUnique.mockResolvedValue(null);
    tx.user.create.mockResolvedValue({ id: 'u-new', email: 'new@corp.example.com' });
    tx.customer.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );

    const cookie = mintCookie(jwtService, 'ADMIN');
    const res = await request(app.getHttpServer())
      .post('/api/admin/customers/invite')
      .set('Cookie', cookie)
      .send({ email: 'new@corp.example.com' })
      .expect(409);

    expect(res.body.message).toMatch(/already exists/i);
  });

  // ── GET /api/admin/customers ──────────────────────────────────────────────

  it('GET 200 with [{id, email}] for ADMIN', async () => {
    tx.customer.findMany.mockResolvedValue([{ id: 'c1', email: 'a@b.c' }]);

    const cookie = mintCookie(jwtService, 'ADMIN');
    const res = await request(app.getHttpServer())
      .get('/api/admin/customers')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body).toEqual([{ id: 'c1', email: 'a@b.c' }]);
  });

  it('GET 403 for USER', async () => {
    const cookie = mintCookie(jwtService, 'USER');
    await request(app.getHttpServer())
      .get('/api/admin/customers')
      .set('Cookie', cookie)
      .expect(403);
  });
});
