import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetApiAdminCustomersResponseDto,
  PostApiAdminCustomersInviteResponseDto,
} from './customer-invite.dto';

@Injectable()
export class CustomerInviteService {
  private readonly logger = new Logger(CustomerInviteService.name);

  constructor(private readonly prisma: PrismaService) {}

  async invite(email: string): Promise<PostApiAdminCustomersInviteResponseDto> {
    try {
      const result = await this.prisma.runAsAdmin(async (tx) => {
        const existingCustomer = await tx.customer.findUnique({ where: { email } });
        const existingUser = await tx.user.findUnique({ where: { email } });
        if (existingCustomer || existingUser) {
          throw new ConflictException('Customer already exists');
        }

        const user = await tx.user.create({
          data: { email, role: 'CUSTOMER' },
        });

        const customer = await tx.customer.create({
          data: { email, userId: user.id },
        });

        return customer;
      });

      this.logger.log(`customer invitation sent to ${email}`);
      return {
        customerId: result.id,
        email: result.email,
        invitationSent: true,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Customer already exists');
      }
      throw err;
    }
  }

  async list(): Promise<GetApiAdminCustomersResponseDto[]> {
    return this.prisma.runAsAdmin((tx) =>
      tx.customer.findMany({
        select: { id: true, email: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }
}
