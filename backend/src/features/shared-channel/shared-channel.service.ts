import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { SessionPayload } from '../../auth/session.types';

@Injectable()
export class SharedChannelService {
  constructor(private readonly prisma: PrismaService) {}

  async createChannel(userId: string, name: string): Promise<{ id: string; name: string }> {
    if (!name || !name.trim()) {
      throw new BadRequestException('name is required');
    }
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) {
      throw new NotFoundException('vendor profile not found');
    }
    const channel = await this.prisma.channel.create({
      data: {
        name: name.trim(),
        vendorId: vendorProfile.id,
        vendorProfileId: vendorProfile.id,
      },
    });
    return { id: channel.id, name: channel.name };
  }

  async listChannels(_session: SessionPayload): Promise<Array<{ id: string; name: string }>> {
    const channels = await this.prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return channels.map((c) => ({ id: c.id, name: c.name }));
  }

  async postMessage(
    channelId: string,
    session: SessionPayload,
    body: string,
  ): Promise<{ id: string; body: string; channelId: string }> {
    if (!body || !body.trim()) {
      throw new BadRequestException('body is required');
    }
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
      throw new NotFoundException('channel not found');
    }
    const message = await this.prisma.message.create({
      data: {
        body: body.trim(),
        channelId,
        senderId: session.userId,
      },
    });
    return { id: message.id, body: message.body, channelId: message.channelId };
  }
}
