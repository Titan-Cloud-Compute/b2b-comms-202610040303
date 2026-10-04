import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { GetApiAdminAuditLogResponseDto, PostApiAdminAuditLogResponseDto, CreateAuditEntryDto } from './audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<GetApiAdminAuditLogResponseDto[]> {
    const entries = await this.prisma.auditEntry.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return entries.map((e) => ({
      id: e.id,
      action: e.action,
      userId: e.userId,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  async create(dto: CreateAuditEntryDto): Promise<PostApiAdminAuditLogResponseDto> {
    const entry = await this.prisma.auditEntry.create({
      data: { action: dto.action, userId: dto.userId },
    });
    return {
      id: entry.id,
      action: entry.action,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}
