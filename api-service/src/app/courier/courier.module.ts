import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { OtpModule } from '../otp/otp.module';
import { CourierController } from './courier.controller';
import { CourierService } from './courier.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') || '1d') as any,
        },
      }),
      inject: [ConfigService],
    }),
    OtpModule,
  ],
  controllers: [CourierController],
  providers: [CourierService, PrismaService],
})
export class CourierModule {}
