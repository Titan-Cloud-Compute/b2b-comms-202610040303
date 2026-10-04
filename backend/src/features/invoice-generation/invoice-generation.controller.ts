import { Controller, NotImplementedException, UseGuards, Post, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { InvoiceGenerationService } from './invoice-generation.service';

@ApiTags('invoice-generation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('api/invoice-generation')
export class InvoiceGenerationController {
  constructor(private readonly invoicegeneration: InvoiceGenerationService) {}

  @Post('api/invoices')
  async postApiInvoices() {
    throw new NotImplementedException();
  }

  @Get('api/invoices/:id/download')
  async getApiInvoicesDownload() {
    throw new NotImplementedException();
  }

}
