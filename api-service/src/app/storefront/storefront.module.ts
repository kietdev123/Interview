import { Module } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { StorefrontController } from './storefront.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [StorefrontController],
  providers: [StorefrontService, PrismaService],
})
export class StorefrontModule {}
