/**
 * Supertest integration spec for SharedChannelController.
 *
 * Uses a real NestJS testing module with:
 *   - SharedChannelController and SharedChannelService (real)
 *   - PrismaService mocked with in-memory arrays
 *   - JwtAuthGuard overridden with a test guard that reads x-test-session header
 *   - Real RolesGuard to exercise role enforcement
 *
 * Contract assertions:
 *   POST /api/channels (VENDOR) → 201 { id, name }
 *   GET /api/channels (VENDOR, CUSTOMER) → 200 [{ id, name }]
 *   POST /api/channels/:id/messages (VENDOR, CUSTOMER) → 201 { id, body, channelId }
 *   Other roles → 403
 *   No session → 401
 *   Unknown channel → 404
 *   Empty body → 400
 */

import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../../auth/roles.guard';
import { SharedChannelController } from './shared-channel.controller';
import { SharedChannelService } from './shared-channel.service';

// ---------------------------------------------------------------------------
// In-memory Prisma mock
// ---------------------------------------------------------------------------
type VendorProfileRow = { id: string; userId: string; companyName: string; contactEmail: string };
type ChannelRow = { id: string; name: string; vendorId: string; vendorProfileId: string; createdAt: Date };
type MessageRow = { id: string; body: string; channelId: string; senderId: string; createdAt: Date };

function makePrismaService() {
  const vendorProfiles: VendorProfileRow[] = [];
  const channels: ChannelRow[] = [];
  const messages: MessageRow[] = [];

  let seq = 0;
  const nextId = () => `id-${++seq}`;

  return {
    _seed: {
      addVendorProfile: (vp: VendorProfileRow) => vendorProfiles.push(vp),
    },
    vendorProfile: {
      findUnique: jest.fn(({ where }: { where: { userId?: string; id?: string } }) =>
        Promise.resolve(vendorProfiles.find((v) =>
          (where.userId && v.userId === where.userId) ||
          (where.id && v.id === where.id)
        ) ?? null),
      ),
    },
    channel: {
      create: jest.fn(({ data }: { data: Omit<ChannelRow, 'id' | 'createdAt'> }) => {
        const row: ChannelRow = { ...data, id: nextId(), createdAt: new Date() };
        channels.push(row);
        return Promise.resolve(row);
      }),
      findMany: jest.fn(() => Promise.resolve([...channels])),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(channels.find((c) => c.id === where.id) ?? null),
      ),
    },
    message: {
      create: jest.fn(({ data }: { data: Omit<MessageRow, 'id' | 'createdAt'> }) => {
        const row: MessageRow = { ...data, id: nextId(), createdAt: new Date() };
        messages.push(row);
        return Promise.resolve(row);
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// Test guard: reads JSON from x-test-session header and sets req.session
// ---------------------------------------------------------------------------
class TestJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const raw = req.headers['x-test-session'];
    if (!raw) throw new UnauthorizedException('not authenticated');
    req.session = JSON.parse(raw as string);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Helpers to build session headers
// ---------------------------------------------------------------------------
function sessionHeader(userId: string, role: string) {
  return JSON.stringify({ userId, role, firmId: null });
}

const VENDOR_ID = 'user-vendor-1';
const CUSTOMER_ID = 'user-customer-1';
const USER_ID = 'user-regular-1';
const VENDOR_PROFILE_ID = 'vp-1';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SharedChannelController (supertest)', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof makePrismaService>;

  beforeEach(async () => {
    prisma = makePrismaService();
    // Seed a vendor profile so createChannel can resolve the vendorId
    prisma._seed.addVendorProfile({
      id: VENDOR_PROFILE_ID,
      userId: VENDOR_ID,
      companyName: 'Acme',
      contactEmail: 'vendor@acme.example.com',
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [SharedChannelController],
      providers: [
        SharedChannelService,
        { provide: PrismaService, useValue: prisma },
        Reflector,
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // POST /api/channels
  // -------------------------------------------------------------------------
  describe('POST /api/channels', () => {
    it('VENDOR creates a channel → 201 { id, name }', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/channels')
        .set('x-test-session', sessionHeader(VENDOR_ID, 'VENDOR'))
        .send({ name: 'Acme ↔ Corp' })
        .expect(201);

      expect(res.body).toMatchObject({ id: expect.any(String), name: 'Acme ↔ Corp' });
    });

    it('CUSTOMER cannot create a channel → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/channels')
        .set('x-test-session', sessionHeader(CUSTOMER_ID, 'CUSTOMER'))
        .send({ name: 'Test Channel' })
        .expect(403);
    });

    it('USER role cannot create a channel → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/channels')
        .set('x-test-session', sessionHeader(USER_ID, 'USER'))
        .send({ name: 'Test Channel' })
        .expect(403);
    });

    it('no session → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/channels')
        .send({ name: 'Test Channel' })
        .expect(401);
    });

    it('empty name → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/channels')
        .set('x-test-session', sessionHeader(VENDOR_ID, 'VENDOR'))
        .send({ name: '' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/channels
  // -------------------------------------------------------------------------
  describe('GET /api/channels', () => {
    beforeEach(async () => {
      // Create a channel first
      await request(app.getHttpServer())
        .post('/api/channels')
        .set('x-test-session', sessionHeader(VENDOR_ID, 'VENDOR'))
        .send({ name: 'Acme ↔ Corp' });
    });

    it('VENDOR can list channels → 200 with array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/channels')
        .set('x-test-session', sessionHeader(VENDOR_ID, 'VENDOR'))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toMatchObject({ id: expect.any(String), name: 'Acme ↔ Corp' });
    });

    it('CUSTOMER can list channels → 200 with array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/channels')
        .set('x-test-session', sessionHeader(CUSTOMER_ID, 'CUSTOMER'))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('USER role cannot list channels → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/channels')
        .set('x-test-session', sessionHeader(USER_ID, 'USER'))
        .expect(403);
    });

    it('no session → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/channels')
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/channels/:id/messages
  // -------------------------------------------------------------------------
  describe('POST /api/channels/:id/messages', () => {
    let channelId: string;

    beforeEach(async () => {
      // Create a channel to post messages to
      const res = await request(app.getHttpServer())
        .post('/api/channels')
        .set('x-test-session', sessionHeader(VENDOR_ID, 'VENDOR'))
        .send({ name: 'Test Channel' });
      channelId = res.body.id;
    });

    it('CUSTOMER posts a message → 201 { id, body, channelId }', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/channels/${channelId}/messages`)
        .set('x-test-session', sessionHeader(CUSTOMER_ID, 'CUSTOMER'))
        .send({ body: 'hello' })
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        body: 'hello',
        channelId,
      });
    });

    it('VENDOR posts a message → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/channels/${channelId}/messages`)
        .set('x-test-session', sessionHeader(VENDOR_ID, 'VENDOR'))
        .send({ body: 'vendor reply' })
        .expect(201);

      expect(res.body).toMatchObject({ id: expect.any(String), body: 'vendor reply', channelId });
    });

    it('USER role cannot post messages → 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/channels/${channelId}/messages`)
        .set('x-test-session', sessionHeader(USER_ID, 'USER'))
        .send({ body: 'unauthorized' })
        .expect(403);
    });

    it('no session → 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/channels/${channelId}/messages`)
        .send({ body: 'anonymous' })
        .expect(401);
    });

    it('unknown channel id → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/channels/nonexistent-channel/messages')
        .set('x-test-session', sessionHeader(CUSTOMER_ID, 'CUSTOMER'))
        .send({ body: 'hello' })
        .expect(404);
    });

    it('empty body → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/channels/${channelId}/messages`)
        .set('x-test-session', sessionHeader(CUSTOMER_ID, 'CUSTOMER'))
        .send({ body: '' })
        .expect(400);
    });
  });
});
