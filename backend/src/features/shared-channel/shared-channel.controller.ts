import {
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
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../../auth/roles.guard';
import type {
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
  @HttpCode(201)
  @Roles(UserRole.VENDOR)
  async createChannel(@Req() req: Request, @Body() dto: CreateChannelRequestDto) {
    return this.sharedchannel.createChannel(req.session!.userId, dto?.name);
  }

  @Get()
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER)
  async listChannels(@Req() req: Request) {
    return this.sharedchannel.listChannels(req.session!);
  }

  @Post(':id/messages')
  @HttpCode(201)
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER)
  async postMessage(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: CreateMessageRequestDto,
  ) {
    return this.sharedchannel.postMessage(id, req.session!, dto?.body);
  }
}
