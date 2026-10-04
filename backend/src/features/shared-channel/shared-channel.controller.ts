import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import {
  CreateChannelRequestDto,
  CreateMessageRequestDto,
} from './shared-channel.dto';
import { SharedChannelService } from './shared-channel.service';

@ApiTags('shared-channel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/channels')
export class SharedChannelController {
  constructor(private readonly sharedchannel: SharedChannelService) {}

  @Post()
  @Roles(UserRole.VENDOR)
  async createChannel(@Req() req: any, @Body() dto: CreateChannelRequestDto) {
    return this.sharedchannel.createChannel(req.session!.userId, dto);
  }

  @Get()
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER)
  async listChannels(@Req() req: any) {
    return this.sharedchannel.listChannels(req.session!);
  }

  @Post(':id/messages')
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER)
  async postMessage(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CreateMessageRequestDto,
  ) {
    return this.sharedchannel.postMessage(id, req.session!, dto);
  }
}
