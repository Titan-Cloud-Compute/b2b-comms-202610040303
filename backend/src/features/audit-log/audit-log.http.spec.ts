/**
 * Fail-to-pass HTTP integration spec for the audit-log feature.
 * Tests the full NestJS request pipeline (guards → controller → service)
 * with an in-memory PrismaService fake and a fake JwtAuthGuard.
 */
import { CanActivate, ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as request from 'supertest';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { SessionPayload } from '../../auth/session.types';
import { AuditLogModule } from './audit-log.module';

type MockEntry = { id: string; action: string; userId: string; createdAt: Date; updatedAt: Date };

// Per-test mutable session — set before each request in tests that need a specific role.
let mockSession: SessionPayload | null = null;

class FakeJwtAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    if (!mockSession) throw new UnauthorizedException('not authenticated');
    const req = ctx.switchToHttp().getRequest();
    req.session = mockSession;
    return true;
  }
}

function makeEntry(id: string, action: string, userId: string, createdAt: Date): MockEntry {
  return { id, action, userId, createdAt, updatedAt: createdAt };
}

describe('AuditLog HTTP (integration)', () => {
  let app: INestApplication;
  let store: MockEntry[];

  const fakePrisma = {
    auditEntry: {
      findMany: jest.fn(async () => {
        return [...store].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }),
      create: jest.fn(async ({ data }: { data: { action: string; userId: string } }) => {
        const entry: MockEntry = {
          id: `id-${store.length + 1}`,
          action: data.action,
          userId: data.userId,
          createdAt: new Date('2024-06-01T00:00:00.000Z'),
          updatedAt: new Date('2024-06-01T00:00:00.000Z'),
        };
        store.push(entry);
        return entry;
      }),
    },
  };

  beforeEach(async () => {
    store = [];
    jest.clearAllMocks();
    mockSession = { userId: 'admin-1', role: UserRole.ADMIN, firmId: null };

    const moduleRef = await Test.createTestingModule({
      imports: [AuditLogModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── GET /api/admin/audit-log ──────────────────────────────────────────────

  describe('GET /api/admin/audit-log', () => {
    it('returns 200 with entries ordered by createdAt ascending', async () => {
      // Seed three entries in reverse chronological order
      store.push(makeEntry('c', 'action.c', 'u3', new Date('2024-01-03T00:00:00.000Z')));
      store.push(makeEntry('a', 'action.a', 'u1', new Date('2024-01-01T00:00:00.000Z')));
      store.push(makeEntry('b', 'action.b', 'u2', new Date('2024-01-02T00:00:00.000Z')));

      const res = await request(app.getHttpServer()).get('/api/admin/audit-log');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(3);

      // Verify ascending order
      expect(res.body[0]).toMatchObject({ id: 'a', action: 'action.a', userId: 'u1' });
      expect(res.body[1]).toMatchObject({ id: 'b', action: 'action.b', userId: 'u2' });
      expect(res.body[2]).toMatchObject({ id: 'c', action: 'action.c', userId: 'u3' });

      // Each entry has the required fields
      for (const entry of res.body) {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('action');
        expect(entry).toHaveProperty('userId');
        expect(entry).toHaveProperty('createdAt');
      }
    });

    it('returns 403 for USER role', async () => {
      mockSession = { userId: 'user-1', role: UserRole.USER, firmId: null };
      const res = await request(app.getHttpServer()).get('/api/admin/audit-log');
      expect(res.status).toBe(403);
    });

    it('returns 403 for MANAGER role', async () => {
      mockSession = { userId: 'manager-1', role: UserRole.MANAGER, firmId: null };
      const res = await request(app.getHttpServer()).get('/api/admin/audit-log');
      expect(res.status).toBe(403);
    });

    it('returns 403 for VENDOR role', async () => {
      mockSession = { userId: 'vendor-1', role: UserRole.VENDOR, firmId: null };
      const res = await request(app.getHttpServer()).get('/api/admin/audit-log');
      expect(res.status).toBe(403);
    });

    it('returns 403 for CUSTOMER role', async () => {
      mockSession = { userId: 'customer-1', role: UserRole.CUSTOMER, firmId: null };
      const res = await request(app.getHttpServer()).get('/api/admin/audit-log');
      expect(res.status).toBe(403);
    });

    it('returns 401 when unauthenticated', async () => {
      mockSession = null;
      const res = await request(app.getHttpServer()).get('/api/admin/audit-log');
      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/admin/audit-log ─────────────────────────────────────────────

  describe('POST /api/admin/audit-log', () => {
    it('returns 201 with id, action, createdAt and persists entry with correct userId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/audit-log')
        .send({ action: 'order.confirmed', userId: 'u1' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.action).toBe('order.confirmed');
      expect(res.body).toHaveProperty('createdAt');
      // POST response contract: {id, action, createdAt} — no userId
      expect(res.body).not.toHaveProperty('userId');

      // Verify the fake store recorded the correct userId
      expect(store).toHaveLength(1);
      expect(store[0].userId).toBe('u1');
    });

    it('returns 400 for empty action string', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/audit-log')
        .send({ action: '', userId: 'u1' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing userId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/audit-log')
        .send({ action: 'order.confirmed' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for extra unknown keys (strict schema)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/audit-log')
        .send({ action: 'order.confirmed', userId: 'u1', extraKey: 'bad' });
      expect(res.status).toBe(400);
    });

    it('returns 403 for USER role', async () => {
      mockSession = { userId: 'user-1', role: UserRole.USER, firmId: null };
      const res = await request(app.getHttpServer())
        .post('/api/admin/audit-log')
        .send({ action: 'order.confirmed', userId: 'u1' });
      expect(res.status).toBe(403);
    });

    it('returns 403 for MANAGER role', async () => {
      mockSession = { userId: 'manager-1', role: UserRole.MANAGER, firmId: null };
      const res = await request(app.getHttpServer())
        .post('/api/admin/audit-log')
        .send({ action: 'order.confirmed', userId: 'u1' });
      expect(res.status).toBe(403);
    });

    it('returns 403 for VENDOR role', async () => {
      mockSession = { userId: 'vendor-1', role: UserRole.VENDOR, firmId: null };
      const res = await request(app.getHttpServer())
        .post('/api/admin/audit-log')
        .send({ action: 'order.confirmed', userId: 'u1' });
      expect(res.status).toBe(403);
    });

    it('returns 403 for CUSTOMER role', async () => {
      mockSession = { userId: 'customer-1', role: UserRole.CUSTOMER, firmId: null };
      const res = await request(app.getHttpServer())
        .post('/api/admin/audit-log')
        .send({ action: 'order.confirmed', userId: 'u1' });
      expect(res.status).toBe(403);
    });

    it('returns 401 when unauthenticated', async () => {
      mockSession = null;
      const res = await request(app.getHttpServer())
        .post('/api/admin/audit-log')
        .send({ action: 'order.confirmed', userId: 'u1' });
      expect(res.status).toBe(401);
    });
  });
});
