/**
 * Supertest integration spec for InvoiceGenerationController.
 * PrismaService and MinioService are mocked; guards are overridden to inject a session.
 */
import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { InvoiceGenerationController } from './invoice-generation.controller';
import { InvoiceGenerationService } from './invoice-generation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../lib/integrations/minio.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Reflector } from '@nestjs/core';

// ---- mutable session used by the fake guard ----
let currentSession: { userId: string; role: string } = { userId: 'user-vendor', role: 'VENDOR' };

class FakeJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.session = currentSession;
    return true;
  }
}

// ---- Prisma mock data ----
const confirmedOrder = {
  id: 'o1',
  status: 'CONFIRMED',
  vendorId: 'vp-1',
  customerId: 'cust-1',
  customer: { id: 'cust-1', userId: 'user-customer', email: 'buyer@corp.example.com' },
};

const vendorProfile = { id: 'vp-1', userId: 'user-vendor' };

const createdInvoice = { id: 'inv-1', orderId: 'o1', amount: 120.5 };

const invoiceWithOrder = {
  id: 'inv-1',
  orderId: 'o1',
  amount: 120.5,
  order: {
    ...confirmedOrder,
    customer: { id: 'cust-1', userId: 'user-customer', email: 'buyer@corp.example.com' },
  },
};

// ---- Jest mocks ----
const prismaMock = {
  order: {
    findUnique: jest.fn(),
  },
  invoice: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  vendorProfile: {
    findUnique: jest.fn(),
  },
};

const minioMock = {
  putObject: jest.fn().mockResolvedValue({ etag: 'etag', bucket: 'app', key: 'k' }),
  getSignedUrl: jest.fn().mockResolvedValue('https://minio.example/invoices/inv-1.txt'),
};

describe('InvoiceGenerationController (supertest)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InvoiceGenerationController],
      providers: [
        InvoiceGenerationService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MinioService, useValue: minioMock },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(FakeJwtGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    minioMock.putObject.mockResolvedValue({ etag: 'etag', bucket: 'app', key: 'k' });
    minioMock.getSignedUrl.mockResolvedValue('https://minio.example/invoices/inv-1.txt');
    currentSession = { userId: 'user-vendor', role: 'VENDOR' };
  });

  // ---- POST /api/invoices ----

  it('201: vendor creates invoice for confirmed order', async () => {
    prismaMock.order.findUnique.mockResolvedValue(confirmedOrder);
    prismaMock.vendorProfile.findUnique.mockResolvedValue(vendorProfile);
    prismaMock.invoice.findUnique.mockResolvedValue(null);
    prismaMock.invoice.create.mockResolvedValue(createdInvoice);

    const res = await request(app.getHttpServer())
      .post('/api/invoices')
      .send({ orderId: 'o1', amount: 120.5 })
      .expect(201);

    expect(res.body).toMatchObject({ id: 'inv-1', orderId: 'o1', amount: 120.5 });
    expect(minioMock.putObject).toHaveBeenCalledTimes(1);
  });

  it('404: unknown order', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/invoices')
      .send({ orderId: 'nonexistent', amount: 50 })
      .expect(404);
  });

  it('409: order status is PENDING (not confirmed)', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...confirmedOrder, status: 'PENDING' });
    prismaMock.vendorProfile.findUnique.mockResolvedValue(vendorProfile);

    await request(app.getHttpServer())
      .post('/api/invoices')
      .send({ orderId: 'o1', amount: 50 })
      .expect(409);
  });

  it('409: invoice already exists for this order', async () => {
    prismaMock.order.findUnique.mockResolvedValue(confirmedOrder);
    prismaMock.vendorProfile.findUnique.mockResolvedValue(vendorProfile);
    prismaMock.invoice.findUnique.mockResolvedValue(createdInvoice);

    await request(app.getHttpServer())
      .post('/api/invoices')
      .send({ orderId: 'o1', amount: 50 })
      .expect(409);
  });

  it('400: amount missing', async () => {
    await request(app.getHttpServer())
      .post('/api/invoices')
      .send({ orderId: 'o1' })
      .expect(400);
  });

  it('403: CUSTOMER cannot POST', async () => {
    currentSession = { userId: 'user-customer', role: 'CUSTOMER' };

    await request(app.getHttpServer())
      .post('/api/invoices')
      .send({ orderId: 'o1', amount: 50 })
      .expect(403);
  });

  // ---- GET /api/invoices/:id/download ----

  it('200: customer downloads their own invoice', async () => {
    currentSession = { userId: 'user-customer', role: 'CUSTOMER' };
    prismaMock.invoice.findUnique.mockResolvedValue(invoiceWithOrder);

    const res = await request(app.getHttpServer())
      .get('/api/invoices/inv-1/download')
      .expect(200);

    expect(res.body).toMatchObject({ id: 'inv-1' });
    expect(res.body.downloadUrl).toContain('invoices/inv-1');
  });

  it('403: different customer cannot download', async () => {
    currentSession = { userId: 'user-other-customer', role: 'CUSTOMER' };
    prismaMock.invoice.findUnique.mockResolvedValue(invoiceWithOrder);

    await request(app.getHttpServer())
      .get('/api/invoices/inv-1/download')
      .expect(403);
  });

  it('404: unknown invoice id', async () => {
    currentSession = { userId: 'user-customer', role: 'CUSTOMER' };
    prismaMock.invoice.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/api/invoices/unknown-id/download')
      .expect(404);
  });
});
