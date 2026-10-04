import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SharedChannelService } from './shared-channel.service';

describe('SharedChannelService', () => {
  let service: SharedChannelService;
  let mockPrisma: any;

  const vendorProfile = { id: 'profile-1', userId: 'user-vendor-1' };
  const channel = {
    id: 'channel-1',
    name: 'Test Channel',
    vendorId: 'profile-1',
    vendorProfileId: 'profile-1',
    vendorProfile: vendorProfile,
  };
  const message = {
    id: 'msg-1',
    body: 'Hello',
    channelId: 'channel-1',
    senderId: 'user-customer-1',
  };

  beforeEach(() => {
    mockPrisma = {
      vendorProfile: {
        findUnique: jest.fn(),
      },
      channel: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      message: {
        create: jest.fn(),
      },
    };
    service = new SharedChannelService(mockPrisma);
  });

  describe('createChannel', () => {
    it('throws BadRequestException for empty name', async () => {
      await expect(
        service.createChannel('user-1', { name: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when vendor profile not found', async () => {
      mockPrisma.vendorProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.createChannel('user-1', { name: 'My Channel' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates channel with vendorId and vendorProfileId = profile.id', async () => {
      mockPrisma.vendorProfile.findUnique.mockResolvedValue(vendorProfile);
      mockPrisma.channel.create.mockResolvedValue(channel);

      const result = await service.createChannel('user-vendor-1', {
        name: 'Test Channel',
      });

      expect(mockPrisma.channel.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Channel',
          vendorId: vendorProfile.id,
          vendorProfileId: vendorProfile.id,
        },
      });
      expect(result).toEqual({ id: channel.id, name: channel.name });
    });
  });

  describe('listChannels', () => {
    it('vendor list filters by vendorProfile.userId', async () => {
      mockPrisma.channel.findMany.mockResolvedValue([channel]);

      const result = await service.listChannels({
        userId: 'user-vendor-1',
        role: 'VENDOR',
      });

      expect(mockPrisma.channel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vendorProfile: { userId: 'user-vendor-1' } },
        }),
      );
      expect(result).toEqual([{ id: channel.id, name: channel.name }]);
    });

    it('customer list is unfiltered', async () => {
      mockPrisma.channel.findMany.mockResolvedValue([channel]);

      const result = await service.listChannels({
        userId: 'user-customer-1',
        role: 'CUSTOMER',
      });

      const call = mockPrisma.channel.findMany.mock.calls[0][0];
      expect(call.where).toBeUndefined();
      expect(result).toEqual([{ id: channel.id, name: channel.name }]);
    });

    it('unknown role returns empty array', async () => {
      const result = await service.listChannels({
        userId: 'user-admin',
        role: 'ADMIN',
      });
      expect(result).toEqual([]);
      expect(mockPrisma.channel.findMany).not.toHaveBeenCalled();
    });
  });

  describe('postMessage', () => {
    it('throws BadRequestException for empty body', async () => {
      await expect(
        service.postMessage('channel-1', { userId: 'u1', role: 'CUSTOMER' }, {
          body: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when channel not found', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(null);
      await expect(
        service.postMessage('channel-1', { userId: 'u1', role: 'CUSTOMER' }, {
          body: 'Hello',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when vendor posts in another vendor channel', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(channel);
      await expect(
        service.postMessage(
          'channel-1',
          { userId: 'other-vendor', role: 'VENDOR' },
          { body: 'Hello' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('customer postMessage stores senderId = userId and returns {id, body, channelId}', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(channel);
      mockPrisma.message.create.mockResolvedValue(message);

      const result = await service.postMessage(
        'channel-1',
        { userId: 'user-customer-1', role: 'CUSTOMER' },
        { body: 'Hello' },
      );

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          body: 'Hello',
          channelId: 'channel-1',
          senderId: 'user-customer-1',
        },
      });
      expect(result).toEqual({
        id: message.id,
        body: message.body,
        channelId: message.channelId,
      });
    });

    it('vendor can post in their own channel', async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(channel);
      mockPrisma.message.create.mockResolvedValue({
        ...message,
        senderId: 'user-vendor-1',
      });

      await expect(
        service.postMessage(
          'channel-1',
          { userId: 'user-vendor-1', role: 'VENDOR' },
          { body: 'Hello' },
        ),
      ).resolves.toBeDefined();
    });
  });
});
