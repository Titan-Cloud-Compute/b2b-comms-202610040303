/**
 * Fail-to-pass spec for notification-preferences feature.
 * Tests GET/PUT /api/notifications/preferences backed by a Prisma upsert.
 */
import { ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';

type NotificationPreferenceRow = {
  id: string;
  userId: string;
  orderAlerts: boolean;
  messageAlerts: boolean;
};

function buildFakePrisma(initial?: NotificationPreferenceRow) {
  const store: Map<string, NotificationPreferenceRow> = new Map();
  if (initial) store.set(initial.userId, initial);

  return {
    notificationPreference: {
      findUnique: jest.fn(async ({ where }: { where: { userId: string } }) => {
        return store.get(where.userId) ?? null;
      }),
      upsert: jest.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { userId: string };
          create: NotificationPreferenceRow;
          update: Partial<NotificationPreferenceRow>;
        }) => {
          const existing = store.get(where.userId);
          if (existing) {
            const updated = { ...existing, ...update };
            store.set(where.userId, updated);
            return updated;
          } else {
            const row = { id: 'gen-id', ...create };
            store.set(where.userId, row);
            return row;
          }
        },
      ),
    },
    _store: store,
  };
}

type FakePrisma = ReturnType<typeof buildFakePrisma>;

async function buildApp(
  fakePrisma: FakePrisma,
  authGuardFactory: () => { canActivate: (ctx: ExecutionContext) => boolean },
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [NotificationPreferencesController],
    providers: [
      NotificationPreferencesService,
      { provide: PrismaService, useValue: fakePrisma },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(authGuardFactory())
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

function authenticatedGuard(userId = 'u1', role = 'USER') {
  return {
    canActivate(ctx: ExecutionContext) {
      const req = ctx.switchToHttp().getRequest();
      req.session = { userId, role };
      return true;
    },
  };
}

function unauthenticatedGuard() {
  return {
    canActivate() {
      throw new UnauthorizedException('not authenticated');
    },
  };
}

describe('NotificationPreferencesController (e2e)', () => {
  describe('authenticated user', () => {
    let app: INestApplication;
    let fakePrisma: FakePrisma;

    beforeEach(async () => {
      fakePrisma = buildFakePrisma();
      app = await buildApp(fakePrisma, () => authenticatedGuard('u1', 'USER'));
    });

    afterEach(async () => {
      await app.close();
    });

    it('GET /api/notifications/preferences returns defaults when no row exists', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/notifications/preferences')
        .expect(200);
      expect(res.body).toEqual({ userId: 'u1', orderAlerts: false, messageAlerts: false });
    });

    it('PUT /api/notifications/preferences creates a record and returns 200 with stored values', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/notifications/preferences')
        .send({ orderAlerts: true, messageAlerts: false })
        .expect(200);
      expect(res.body).toEqual({ userId: 'u1', orderAlerts: true, messageAlerts: false });
    });

    it('GET after PUT returns the stored values', async () => {
      await request(app.getHttpServer())
        .put('/api/notifications/preferences')
        .send({ orderAlerts: true, messageAlerts: false })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/notifications/preferences')
        .expect(200);
      expect(res.body).toEqual({ userId: 'u1', orderAlerts: true, messageAlerts: false });
    });

    it('PUT {orderAlerts:false, messageAlerts:false} stores both false', async () => {
      // First set both true
      await request(app.getHttpServer())
        .put('/api/notifications/preferences')
        .send({ orderAlerts: true, messageAlerts: true })
        .expect(200);

      // Then set both false
      const res = await request(app.getHttpServer())
        .put('/api/notifications/preferences')
        .send({ orderAlerts: false, messageAlerts: false })
        .expect(200);
      expect(res.body).toEqual({ userId: 'u1', orderAlerts: false, messageAlerts: false });

      // Verify the fake store holds both false
      const stored = fakePrisma._store.get('u1');
      expect(stored?.orderAlerts).toBe(false);
      expect(stored?.messageAlerts).toBe(false);
    });

    it('PUT with non-boolean orderAlerts returns 400', async () => {
      await request(app.getHttpServer())
        .put('/api/notifications/preferences')
        .send({ orderAlerts: 'yes', messageAlerts: false })
        .expect(400);
    });

    it('PUT with missing field returns 400', async () => {
      await request(app.getHttpServer())
        .put('/api/notifications/preferences')
        .send({ orderAlerts: true })
        .expect(400);
    });

    it('upsert is called with where {userId: u1} and extra body userId is rejected by strict schema', async () => {
      // strict() schema rejects extra keys like userId in body
      await request(app.getHttpServer())
        .put('/api/notifications/preferences')
        .send({ orderAlerts: true, messageAlerts: false, userId: 'attacker' })
        .expect(400);
    });

    it('upsert where clause uses session userId, not body for valid requests', async () => {
      await request(app.getHttpServer())
        .put('/api/notifications/preferences')
        .send({ orderAlerts: false, messageAlerts: true })
        .expect(200);

      const upsertCalls = (fakePrisma.notificationPreference.upsert as jest.Mock).mock.calls;
      expect(upsertCalls.length).toBeGreaterThan(0);
      expect(upsertCalls[0][0].where.userId).toBe('u1');
    });
  });

  describe('unauthenticated request', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const fakePrisma = buildFakePrisma();
      app = await buildApp(fakePrisma, () => unauthenticatedGuard());
    });

    afterEach(async () => {
      await app.close();
    });

    it('GET /api/notifications/preferences returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/notifications/preferences')
        .expect(401);
    });

    it('PUT /api/notifications/preferences returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .put('/api/notifications/preferences')
        .send({ orderAlerts: true, messageAlerts: false })
        .expect(401);
    });
  });
});
