import { Controller, NotImplementedException, UseGuards, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { AuditLogService } from './audit-log.service';

@ApiTags('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/audit-log')
export class AuditLogController {
  constructor(private readonly auditlog: AuditLogService) {}

  @Get('api/admin/audit-log')
  async getApiAdminAuditLog() {
    throw new NotImplementedException();
  }

  @Post('api/admin/audit-log')
  async postApiAdminAuditLog() {
    throw new NotImplementedException();
  }

}
