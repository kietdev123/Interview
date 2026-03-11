import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { OtpService } from '../otp/otp.service';
import { RequestOtpDto, VerifyOtpDto } from '../otp/dto/otp.dto';
import {
  COURIER_OPERATIONAL_STATUS,
  COURIER_REGISTRATION_OTP,
  COURIER_STATUS,
} from '../common/constants/courier.constant';
import { AUTH_MESSAGES, RESOURCE_MESSAGES } from '../common/constants/messages.constant';
import { RESOURCE_TARGETS } from '../common/constants/resource.constant';
import { CourierQueryDto, CourierListResponse } from './dto/courier-query.dto';
import { CourierQueryBuilder } from './builders/courier-query.builder';
import { CreateCourierDto } from './dto/create-courier.dto';
import { AdminCreateCourierDto } from './dto/admin-create-courier.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';
import { CourierEntity } from './entities/courier.entity';

@Injectable()
export class CourierService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    return this.otpService.requestOtp(dto, { rateLimitKey: 'courier' });
  }

  async verifyOtp(dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto, COURIER_REGISTRATION_OTP);
  }

  async register(userId: number, dto: CreateCourierDto) {
    let payload;
    try {
      payload = this.jwtService.verify(dto.verificationToken);
    } catch {
      throw new UnauthorizedException(
        AUTH_MESSAGES.INVALID_OR_EXPIRED_VERIFICATION_TOKEN
      );
    }

    if (payload.type !== COURIER_REGISTRATION_OTP) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_TOKEN_TYPE);
    }

    if (payload.phone !== dto.phone) {
      throw new UnauthorizedException(AUTH_MESSAGES.PHONE_NUMBER_MISMATCH);
    }

    const courier = await this.prisma.courier.create({
      data: {
        userId,
        name: dto.name,
        phone: dto.phone,
        taxCode: dto.taxCode,
        driverLicenseUrl: dto.driverLicenseUrl,
        vehicleImageUrl: dto.vehicleImageUrl,
        idCardUrl: dto.idCardUrl,
        vehicleType: dto.vehicleType,
        approvalStatus: COURIER_STATUS.PENDING,
      },
    });

    return new CourierEntity(courier);
  }

  async adminCreate(adminUserId: number, dto: AdminCreateCourierDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(
        RESOURCE_MESSAGES.NOT_FOUND(RESOURCE_TARGETS.COURIER)
      );
    }

    const courier = await this.prisma.courier.create({
      data: {
        userId: dto.userId,
        name: dto.name,
        phone: dto.phone,
        taxCode: dto.taxCode,
        driverLicenseUrl: dto.driverLicenseUrl,
        vehicleImageUrl: dto.vehicleImageUrl,
        idCardUrl: dto.idCardUrl,
        vehicleType: dto.vehicleType,
        operationalStatus:
          dto.operationalStatus ?? COURIER_OPERATIONAL_STATUS.ACTIVE,
        approvalStatus: COURIER_STATUS.APPROVED,
        approvedAt: new Date(),
        approvedBy: adminUserId,
      },
    });

    const courierRole = await this.prisma.role.findUnique({
      where: { name: 'COURIER' },
      select: { id: true },
    });

    if (courierRole) {
      const existingRole = await this.prisma.userRole.findFirst({
        where: {
          userId: dto.userId,
          roleId: courierRole.id,
        },
      });

      if (!existingRole) {
        await this.prisma.userRole.create({
          data: { userId: dto.userId, roleId: courierRole.id },
        });
      }
    }

    return new CourierEntity(courier);
  }

  async findAll(
    query: CourierQueryDto
  ): Promise<CourierListResponse<CourierEntity>> {
    const take = query.limit ?? 10;
    const skip = query.skip;

    const where = new CourierQueryBuilder()
      .withApprovalStatus(query.approvalStatus)
      .withOperationalStatus(query.operationalStatus)
      .withSearch(query.search)
      .build();

    const [items, total] = await this.prisma.$transaction([
      this.prisma.courier.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.courier.count({ where }),
    ]);

    return {
      data: items.map((item) => new CourierEntity(item)),
      total,
      page: query.page ?? 1,
      limit: take,
    };
  }

  async findById(id: number) {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
    });

    if (!courier) {
      throw new NotFoundException(
        RESOURCE_MESSAGES.NOT_FOUND(RESOURCE_TARGETS.COURIER)
      );
    }

    return new CourierEntity(courier);
  }

  async update(id: number, dto: UpdateCourierDto) {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
    });

    if (!courier) {
      throw new NotFoundException(
        RESOURCE_MESSAGES.NOT_FOUND(RESOURCE_TARGETS.COURIER)
      );
    }

    const updated = await this.prisma.courier.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        taxCode: dto.taxCode,
        driverLicenseUrl: dto.driverLicenseUrl,
        vehicleImageUrl: dto.vehicleImageUrl,
        idCardUrl: dto.idCardUrl,
        vehicleType: dto.vehicleType,
        operationalStatus: dto.operationalStatus,
      },
    });

    return new CourierEntity(updated);
  }

  async remove(id: number) {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
    });

    if (!courier) {
      throw new NotFoundException(
        RESOURCE_MESSAGES.NOT_FOUND(RESOURCE_TARGETS.COURIER)
      );
    }

    await this.prisma.courier.delete({ where: { id } });

    return { message: 'Courier deleted successfully' };
  }

  async approve(adminUserId: number, id: number) {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
    });

    if (!courier) {
      throw new NotFoundException(
        RESOURCE_MESSAGES.NOT_FOUND(RESOURCE_TARGETS.COURIER)
      );
    }

    if (courier.approvalStatus === COURIER_STATUS.APPROVED) {
      return new CourierEntity(courier);
    }

    const updated = await this.prisma.courier.update({
      where: { id },
      data: {
        approvalStatus: COURIER_STATUS.APPROVED,
        approvedAt: new Date(),
        approvedBy: adminUserId,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
      },
    });

    return new CourierEntity(updated);
  }

  async reject(adminUserId: number, id: number, reason: string) {
    if (!reason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const courier = await this.prisma.courier.findUnique({
      where: { id },
    });

    if (!courier) {
      throw new NotFoundException(
        RESOURCE_MESSAGES.NOT_FOUND(RESOURCE_TARGETS.COURIER)
      );
    }

    if (courier.approvalStatus === COURIER_STATUS.REJECTED) {
      return new CourierEntity(courier);
    }

    const updated = await this.prisma.courier.update({
      where: { id },
      data: {
        approvalStatus: COURIER_STATUS.REJECTED,
        rejectedAt: new Date(),
        rejectedBy: adminUserId,
        rejectionReason: reason,
        approvedAt: null,
        approvedBy: null,
      },
    });

    return new CourierEntity(updated);
  }
}
