import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { CreateDocumentSchema, CreateProfileSchema } from './vendor-onboarding.dto';
import { VendorOnboardingService } from './vendor-onboarding.service';

@ApiTags('vendor-onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('api/vendor')
export class VendorOnboardingController {
  constructor(private readonly vendoronboarding: VendorOnboardingService) {}

  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  async postApiVendorProfile(@Req() req: Request, @Body() body: unknown) {
    const result = CreateProfileSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return this.vendoronboarding.createProfile(req.session!.userId, result.data);
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  async postApiVendorDocuments(@Req() req: Request, @Body() body: unknown) {
    const result = CreateDocumentSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return this.vendoronboarding.addDocument(req.session!.userId, result.data);
  }

  @Get('documents')
  async getApiVendorDocuments(@Req() req: Request) {
    return this.vendoronboarding.listDocuments(req.session!.userId);
  }
}
