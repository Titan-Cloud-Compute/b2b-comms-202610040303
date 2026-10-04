import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ChannelResponseDto,
  CreateChannelRequestDto,
  CreateMessageRequestDto,
  MessageResponseDto,
} from './shared-channel.dto';

export interface SessionDto {
  userId: string;
  email?: string;
  role: string;
}

@Injectable()
export class SharedChannelService {
  constructor(private readonly prisma: PrismaService) {}

  async createChannel(
    userId: string,
    dto: CreateChannelRequestDto,
  ): Promise<ChannelResponseDto> {
    const name = (dto.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('Channel name must not be empty');
    }

    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new ConflictException('vendor profile required');
    }

    const channel = await this.prisma.channel.create({
      data: {
        name,
        vendorId: profile.id,
        vendorProfileId: profile.id,
      },
    });

    return { id: channel.id, name: channel.name };
  }

  async listChannels(session: SessionDto): Promise<ChannelResponseDto[]> {
    let channels: Array<{ id: string; name: string }>;

    if (session.role === 'VENDOR') {
      channels = await this.prisma.channel.findMany({
        where: { vendorProfile: { userId: session.userId } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true },
      });
    } else if (session.role === 'CUSTOMER') {
      channels = await this.prisma.channel.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true },
      });
    } else {
      channels = [];
    }

    return channels.map((c) => ({ id: c.id, name: c.name }));
  }

  async postMessage(
    channelId: string,
    session: SessionDto,
    dto: CreateMessageRequestDto,
  ): Promise<MessageResponseDto> {
    const body = (dto.body ?? '').trim();
    if (!body) {
      throw new BadRequestException('Message body must not be empty');
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { vendorProfile: true },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (
      session.role === 'VENDOR' &&
      channel.vendorProfile.userId !== session.userId
    ) {
      throw new ForbiddenException(
        'Vendors may only post in their own channels',
      );
    }

    const message = await this.prisma.message.create({
      data: {
        body,
        channelId: channel.id,
        senderId: session.userId,
      },
    });

    return { id: message.id, body: message.body, channelId: message.channelId };
  }
}
