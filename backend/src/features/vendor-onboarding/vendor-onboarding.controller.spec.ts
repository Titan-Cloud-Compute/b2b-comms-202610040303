/**
 * Integration spec for VendorOnboardingController — wires controller + service
 * against an in-memory Prisma mock and uses supertest over HTTP to assert:
 *   POST /api/vendor/profile → 201 {id, companyName, contactEmail}
 *   POST /api/vendor/profile (duplicate) → 409
 *   POST /api/vendor/profile (invalid email) → 400
 *   POST /api/vendor/documents (no profile) → 404
 *   POST /api/vendor/documents (has profile) → 201 {id, filename, status:'pending'}
 *   GET  /api/vendor/documents → array with the document
 *   session role USER → 403 on any vendor route
 */

import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { RolesGuard } from '../../auth/roles.guard';
import { VendorOnboardingController } from './vendor-onboarding.controller';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { PrismaService } from '../../prisma/prisma.service';

// ────────────────────────────────────────────────────────────
// In-memory store shared across mock calls
// ────────────────────────────────────────────────────────────
function buildPrismaMock() {
  const profiles: Record<string, any> = {};
  const documents: any[] = [];
  let profileSeq = 0;
  let docSeq = 0;

  return {
    vendorProfile: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.userId) return profiles[where.userId] ?? null;
        if (where.id) return Object.values(profiles).find((p: any) => p.id === where.id) ?? null;
        return null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const p = { id: `vp-${++profileSeq}`, ...data };
        profiles[data.userId] = p;
        return p;
      }),
    },
    document: {
      create: jest.fn(async ({ data }: any) => {
        const d = { id: `doc-${++docSeq}`, createdAt: new Date(), ...data };
        documents.push(d);
        return d;
      }),
      findMany: jest.fn(async ({ where }: any) => {
        return documents
          .filter((d) => d.vendorProfileId === where.vendorProfileId)
          .sort((a, b) => b.createdAt - a.createdAt);
      }),
    },
    _reset() {
      Object.keys(profiles).forEach((k) => delete profiles[k]);
      documents.length = 0;
      profileSeq = 0;
      docSeq = 0;
      (this.vendorProfile.findUnique as jest.Mock).mockClear();
      (this.vendorProfile.create as jest.Mock).mockClear();
      (this.document.create as jest.Mock).mockClear();
      (this.document.findMany as jest.Mock).mockClear();
    },
  };
}

// ────────────────────────────────────────────────────────────
// Auth guard factory — injects a session with given role
// ────────────────────────────────────────────────────────────
function makeAuthGuard(role: string): CanActivate {
  return {
    canActivate(ctx: ExecutionContext) {
      const req = ctx.switchToHttp().getRequest();
      req.session = { userId: 'u1', role, firmId: null };
      return true;
    },
  };
}

const VENDOR_GUARD = makeAuthGuard('VENDOR');
const USER_GUARD = makeAuthGuard('USER');

// ────────────────────────────────────────────────────────────
// Helper to build an app with the given auth guard
// ────────────────────────────────────────────────────────────
async function buildApp(prismaMock: ReturnType<typeof buildPrismaMock>, authGuard: CanActivate) {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [VendorOnboardingController],
    providers: [
      VendorOnboardingService,
      { provide: PrismaService, useValue: prismaMock },
      Reflector,
    ],
  })
    .overrideGuard(require('../../auth/jwt-auth.guard').JwtAuthGuard)
    .useValue(authGuard)
    .compile();

  const app: INestApplication = module.createNestApplication();
  await app.init();
  return app;
}

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────
describe('VendorOnboardingController (HTTP)', () => {
  let app: INestApplication;
  const prismaMock = buildPrismaMock();

  beforeEach(async () => {
    prismaMock._reset();
    if (app) await app.close();
    app = await buildApp(prismaMock, VENDOR_GUARD);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // ── POST /api/vendor/profile ──────────────────────────────

  it('POST /api/vendor/profile → 201 with {id, companyName, contactEmail}', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/vendor/profile')
      .send({ companyName: 'Acme Corp', contactEmail: 'vendor@acme.example.com' })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      companyName: 'Acme Corp',
      contactEmail: 'vendor@acme.example.com',
    });
  });

  it('POST /api/vendor/profile (duplicate) → 409', async () => {
    await request(app.getHttpServer())
      .post('/api/vendor/profile')
      .send({ companyName: 'Acme Corp', contactEmail: 'vendor@acme.example.com' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/vendor/profile')
      .send({ companyName: 'Acme Corp', contactEmail: 'vendor@acme.example.com' })
      .expect(409);
  });

  it('POST /api/vendor/profile (invalid email) → 400', async () => {
    await request(app.getHttpServer())
      .post('/api/vendor/profile')
      .send({ companyName: 'Acme Corp', contactEmail: 'not-an-email' })
      .expect(400);
  });

  // ── POST /api/vendor/documents ────────────────────────────

  it('POST /api/vendor/documents before a profile → 404', async () => {
    await request(app.getHttpServer())
      .post('/api/vendor/documents')
      .send({ filename: 'compliance.pdf' })
      .expect(404);
  });

  it('POST /api/vendor/documents after a profile → 201 with {id, filename, status:"pending"}', async () => {
    await request(app.getHttpServer())
      .post('/api/vendor/profile')
      .send({ companyName: 'Acme Corp', contactEmail: 'vendor@acme.example.com' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/vendor/documents')
      .send({ filename: 'compliance.pdf' })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      filename: 'compliance.pdf',
      status: 'pending',
    });
  });

  // ── GET /api/vendor/documents ─────────────────────────────

  it('GET /api/vendor/documents → array containing uploaded document', async () => {
    await request(app.getHttpServer())
      .post('/api/vendor/profile')
      .send({ companyName: 'Acme Corp', contactEmail: 'vendor@acme.example.com' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/vendor/documents')
      .send({ filename: 'compliance.pdf' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/vendor/documents')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ filename: 'compliance.pdf', status: 'pending' });
  });

  // ── Role enforcement ──────────────────────────────────────

  it('session with role USER → 403', async () => {
    const userApp = await buildApp(prismaMock, USER_GUARD);
    try {
      await request(userApp.getHttpServer())
        .post('/api/vendor/profile')
        .send({ companyName: 'Acme Corp', contactEmail: 'vendor@acme.example.com' })
        .expect(403);
    } finally {
      await userApp.close();
    }
  });
});
