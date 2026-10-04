import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { RolesGuard } from '../../auth/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { SharedChannelController } from './shared-channel.controller';
import { SharedChannelService } from './shared-channel.service';

// ── in-memory fake PrismaService ─────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildPrismaFake() {
  const vendorProfiles: any[] = [];
  const channels: any[] = [];
  const messages: any[] = [];

  return {
    vendorProfile: {
      findUnique: ({ where }: any) =>
        Promise.resolve(
          vendorProfiles.find(
            (p) => (where.userId && p.userId === where.userId) ||
                   (where.id && p.id === where.id),
          ) ?? null,
        ),
      _seed: (p: any) => vendorProfiles.push(p),
    },
    channel: {
      create: ({ data }: any) => {
        const ch = { id: makeId(), createdAt: new Date(), ...data };
        channels.push(ch);
        return Promise.resolve(ch);
      },
      findMany: ({ where, orderBy, select }: any) => {
        let list = [...channels];
        if (where?.vendorProfile?.userId) {
          const uid = where.vendorProfile.userId;
          const vp = vendorProfiles.find((p) => p.userId === uid);
          list = vp ? list.filter((c) => c.vendorId === vp.id) : [];
        }
        if (select) {
          list = list.map((c) => {
            const out: any = {};
            for (const k of Object.keys(select)) out[k] = c[k];
            return out;
          });
        }
        return Promise.resolve(list);
      },
      findUnique: ({ where, include }: any) => {
        const ch = channels.find((c) => c.id === where.id) ?? null;
        if (!ch) return Promise.resolve(null);
        if (include?.vendorProfile) {
          const vp = vendorProfiles.find((p) => p.id === ch.vendorId) ?? null;
          return Promise.resolve({ ...ch, vendorProfile: vp });
        }
        return Promise.resolve(ch);
      },
    },
    message: {
      create: ({ data }: any) => {
        const msg = { id: makeId(), ...data };
        messages.push(msg);
        return Promise.resolve(msg);
      },
    },
  };
}

// ── TestJwtAuthGuard — reads session from header ──────────────────────────────

class TestJwtAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const raw = req.headers['x-test-session'];
    if (!raw) throw new UnauthorizedException('not authenticated');
    req.session = JSON.parse(raw);
    return true;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function session(role: string, userId = makeId()) {
  return JSON.stringify({ userId, role, email: `${role.toLowerCase()}@test.com` });
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('SharedChannelController (supertest)', () => {
  let app: INestApplication;
  let prismaFake: ReturnType<typeof buildPrismaFake>;
  const vendorUserId = makeId();
  const customerUserId = makeId();
  const userUserId = makeId();
  const vendorSession = session('VENDOR', vendorUserId);
  const customerSession = session('CUSTOMER', customerUserId);
  const userSession = session('USER', userUserId);

  beforeAll(async () => {
    prismaFake = buildPrismaFake();
    // Seed a vendor profile so createChannel succeeds
    const vendorProfileId = makeId();
    (prismaFake.vendorProfile as any)._seed({
      id: vendorProfileId,
      userId: vendorUserId,
      companyName: 'Acme Corp',
      contactEmail: 'vendor@acme.example.com',
    });

    const module = await Test.createTestingModule({
      controllers: [SharedChannelController],
      providers: [
        SharedChannelService,
        { provide: PrismaService, useValue: prismaFake },
        Reflector,
        RolesGuard,
      ],
    })
      .overrideGuard(require('../../auth/jwt-auth.guard').JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /api/channels ──────────────────────────────────────────────────

  describe('POST /api/channels', () => {
    it('VENDOR creates a channel → 201 { id, name }', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/channels')
        .set('x-test-session', vendorSession)
        .send({ name: 'Acme ↔ Corp' })
        .expect(201);
      expect(res.body).toMatchObject({ id: expect.any(String), name: 'Acme ↔ Corp' });
    });

    it('CUSTOMER cannot create a channel → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/channels')
        .set('x-test-session', customerSession)
        .send({ name: 'Bad' })
        .expect(403);
    });

    it('USER role cannot create a channel → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/channels')
        .set('x-test-session', userSession)
        .send({ name: 'Bad' })
        .expect(403);
    });

    it('no session → 401', async () => {
      await request(app.getHttpServer())
        .post('/api/channels')
        .send({ name: 'Bad' })
        .expect(401);
    });

    it('empty name → 400', async () => {
      await request(app.getHttpServer())
        .post('/api/channels')
        .set('x-test-session', vendorSession)
        .send({ name: '   ' })
        .expect(400);
    });
  });

  // ── GET /api/channels ───────────────────────────────────────────────────

  describe('GET /api/channels', () => {
    it('VENDOR can list channels → 200 with array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/channels')
        .set('x-test-session', vendorSession)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('CUSTOMER can list channels → 200 with array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/channels')
        .set('x-test-session', customerSession)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('USER role cannot list channels → 403', async () => {
      await request(app.getHttpServer())
        .get('/api/channels')
        .set('x-test-session', userSession)
        .expect(403);
    });

    it('no session → 401', async () => {
      await request(app.getHttpServer())
        .get('/api/channels')
        .expect(401);
    });
  });

  // ── POST /api/channels/:id/messages ────────────────────────────────────

  describe('POST /api/channels/:id/messages', () => {
    let channelId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/channels')
        .set('x-test-session', vendorSession)
        .send({ name: 'Message Test Channel' });
      channelId = res.body.id;
    });

    it('CUSTOMER posts a message → 201 { id, body, channelId }', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/channels/${channelId}/messages`)
        .set('x-test-session', customerSession)
        .send({ body: 'hello' })
        .expect(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        body: 'hello',
        channelId,
      });
    });

    it('VENDOR posts a message → 201', async () => {
      await request(app.getHttpServer())
        .post(`/api/channels/${channelId}/messages`)
        .set('x-test-session', vendorSession)
        .send({ body: 'vendor reply' })
        .expect(201);
    });

    it('USER role cannot post messages → 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/channels/${channelId}/messages`)
        .set('x-test-session', userSession)
        .send({ body: 'hello' })
        .expect(403);
    });

    it('no session → 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/channels/${channelId}/messages`)
        .send({ body: 'hello' })
        .expect(401);
    });

    it('unknown channel id → 404', async () => {
      await request(app.getHttpServer())
        .post('/api/channels/nonexistent-id/messages')
        .set('x-test-session', customerSession)
        .send({ body: 'hello' })
        .expect(404);
    });

    it('empty body → 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/channels/${channelId}/messages`)
        .set('x-test-session', customerSession)
        .send({ body: '   ' })
        .expect(400);
    });
  });
});
