import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../lib/integrations/minio.service';
import { SessionPayload } from '../../auth/session.types';
import { PostApiInvoicesResponseDto, GetApiInvoiceDownloadResponseDto } from './invoice-generation.dto';

@Injectable()
export class InvoiceGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async create(
    session: SessionPayload,
    body: { orderId: string; amount: number },
  ): Promise<PostApiInvoicesResponseDto> {
    const { orderId, amount } = body;

    // Load order with customer
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status.toLowerCase() !== 'confirmed') {
      throw new ConflictException('Order is not confirmed');
    }

    // Vendor ownership check
    if (session.role === UserRole.VENDOR) {
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId: session.userId },
      });
      const vendorId = vendorProfile?.id ?? session.userId;
      if (order.vendorId !== vendorId) {
        throw new ForbiddenException('You do not own this order');
      }
    }

    // Check for existing invoice
    const existing = await this.prisma.invoice.findUnique({ where: { orderId } });
    if (existing) {
      throw new ConflictException('Invoice already exists for this order');
    }

    // Create invoice
    const invoice = await this.prisma.invoice.create({
      data: { orderId, amount },
    });

    // Upload plain-text invoice to MinIO
    const content = `Invoice ID: ${invoice.id}\nOrder ID: ${orderId}\nAmount: ${amount}\nDate: ${new Date().toISOString()}`;
    const buf = Buffer.from(content, 'utf-8');
    await this.minio.putObject(`invoices/${invoice.id}.txt`, buf, buf.length, 'text/plain');

    return { id: invoice.id, orderId, amount };
  }

  async getDownload(
    session: SessionPayload,
    id: string,
  ): Promise<GetApiInvoiceDownloadResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { order: { include: { customer: true } } },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    const order = invoice.order;

    if (session.role === UserRole.CUSTOMER) {
      if (order.customer.userId !== session.userId) {
        throw new ForbiddenException('You do not have access to this invoice');
      }
    } else if (session.role === UserRole.VENDOR) {
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId: session.userId },
      });
      const vendorId = vendorProfile?.id ?? session.userId;
      if (order.vendorId !== vendorId) {
        throw new ForbiddenException('You do not own this invoice');
      }
    }
    // ADMIN always passes

    const downloadUrl = await this.minio.getSignedUrl(`invoices/${id}.txt`);
    return { id, downloadUrl };
  }
}
