import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateProfileDto, CreateDocumentDto } from './vendor-onboarding.dto';

@Injectable()
export class VendorOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(
    userId: string,
    dto: CreateProfileDto,
  ): Promise<{ id: string; companyName: string; contactEmail: string }> {
    const existing = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('Vendor profile already exists');
    }
    const profile = await this.prisma.vendorProfile.create({
      data: {
        companyName: dto.companyName,
        contactEmail: dto.contactEmail,
        userId,
      },
    });
    return { id: profile.id, companyName: profile.companyName, contactEmail: profile.contactEmail };
  }

  async addDocument(
    userId: string,
    dto: CreateDocumentDto,
  ): Promise<{ id: string; filename: string; status: string }> {
    const profile = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Submit your vendor profile first');
    }
    const doc = await this.prisma.document.create({
      data: {
        filename: dto.filename,
        status: 'pending',
        vendorProfileId: profile.id,
      },
    });
    return { id: doc.id, filename: doc.filename, status: doc.status };
  }

  async listDocuments(userId: string): Promise<{ id: string; filename: string; status: string }[]> {
    const profile = await this.prisma.vendorProfile.findUnique({ where: { userId } });
    if (!profile) {
      return [];
    }
    const docs = await this.prisma.document.findMany({
      where: { vendorProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((d) => ({ id: d.id, filename: d.filename, status: d.status }));
  }
}
