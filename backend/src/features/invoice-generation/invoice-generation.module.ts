import { Module } from '@nestjs/common';
import { InvoiceGenerationController } from './invoice-generation.controller';
import { InvoiceGenerationService } from './invoice-generation.service';

@Module({
  controllers: [InvoiceGenerationController],
  providers: [InvoiceGenerationService],
})
export class InvoiceGenerationModule {}
