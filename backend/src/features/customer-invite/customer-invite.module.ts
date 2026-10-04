import { Module } from '@nestjs/common';
import { CustomerInviteController } from './customer-invite.controller';
import { CustomerInviteService } from './customer-invite.service';

@Module({
  controllers: [CustomerInviteController],
  providers: [CustomerInviteService],
})
export class CustomerInviteModule {}
