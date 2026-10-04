import { BadRequestException, Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { createAuditEntrySchema } from './audit-log.dto';
import { AuditLogService } from './audit-log.service';

@ApiTags('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/audit-log')
export class AuditLogController {
  constructor(private readonly auditlog: AuditLogService) {}

  @Get()
  async list() {
    return this.auditlog.list();
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: unknown) {
    const result = createAuditEntrySchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return this.auditlog.create(result.data);
  }
}
