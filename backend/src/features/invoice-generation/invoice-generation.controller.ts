import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { InvoiceGenerationService } from './invoice-generation.service';
import type { Request } from 'express';

const createInvoiceSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
});

@ApiTags('invoice-generation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/invoices')
export class InvoiceGenerationController {
  constructor(private readonly invoiceGenerationService: InvoiceGenerationService) {}

  @Post()
  @HttpCode(201)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async create(@Req() req: Request, @Body() body: unknown) {
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.invoiceGenerationService.create(req.session!, parsed.data);
  }

  @Get(':id/download')
  @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.ADMIN)
  async download(@Req() req: Request, @Param('id') id: string) {
    return this.invoiceGenerationService.getDownload(req.session!, id);
  }
}
