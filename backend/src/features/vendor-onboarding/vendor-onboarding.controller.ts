import { Controller, NotImplementedException, UseGuards, Post, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { VendorOnboardingService } from './vendor-onboarding.service';

@ApiTags('vendor-onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('api/vendor-onboarding')
export class VendorOnboardingController {
  constructor(private readonly vendoronboarding: VendorOnboardingService) {}

  @Post('api/vendor/profile')
  async postApiVendorProfile() {
    throw new NotImplementedException();
  }

  @Post('api/vendor/documents')
  async postApiVendorDocuments() {
    throw new NotImplementedException();
  }

  @Get('api/vendor/documents')
  async getApiVendorDocuments() {
    throw new NotImplementedException();
  }

}
