import { Controller, NotImplementedException, UseGuards, Post, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import { SharedChannelService } from './shared-channel.service';

@ApiTags('shared-channel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('api/shared-channel')
export class SharedChannelController {
  constructor(private readonly sharedchannel: SharedChannelService) {}

  @Post('api/channels')
  async postApiChannels() {
    throw new NotImplementedException();
  }

  @Post('api/channels/:id/messages')
  async postApiChannels:idMessages() {
    throw new NotImplementedException();
  }

  @Get('api/channels')
  async getApiChannels() {
    throw new NotImplementedException();
  }

}
