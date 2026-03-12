import { Module } from '@nestjs/common';
import { CourierController } from './courier.controller';
import { CourierService } from './courier.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CourierController],
  providers: [CourierService, PrismaService],
})
export class CourierModule {}
