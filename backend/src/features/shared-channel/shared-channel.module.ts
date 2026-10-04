import { Module } from '@nestjs/common';
import { SharedChannelController } from './shared-channel.controller';
import { SharedChannelService } from './shared-channel.service';

@Module({
  controllers: [SharedChannelController],
  providers: [SharedChannelService],
})
export class SharedChannelModule {}
