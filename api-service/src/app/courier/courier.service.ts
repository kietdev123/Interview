import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CourierApprovalStatus, CourierOnlineStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { UpdateCourierStatusDto } from './dto/update-courier-status.dto';
import { UpdateCourierLocationDto } from './dto/update-courier-location.dto';
import { ApproveCourierDto } from './dto/approve-courier.dto';

@Injectable()
export class CourierService {
  constructor(private prisma: PrismaService) {}

  async findEligibleCouriers(search?: string) {
    const keyword = search?.trim();

    return this.prisma.courier.findMany({
      where: {
        approvalStatus: CourierApprovalStatus.APPROVED,
        onlineStatus: CourierOnlineStatus.ONLINE,
        ...(keyword
          ? {
              OR: [
                { name: { contains: keyword, mode: 'insensitive' } },
                { phone: { contains: keyword } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            externalId: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async updateOnlineStatus(userId: number, dto: UpdateCourierStatusDto) {
    return this.prisma.courier.update({
      where: { userId },
      data: { onlineStatus: dto.onlineStatus },
    });
  }

  async updateLocation(userId: number, dto: UpdateCourierLocationDto) {
    return this.prisma.courier.update({
      where: { userId },
      data: { latitude: dto.latitude, longitude: dto.longitude },
    });
  }

  async approveCourier(courierId: string, dto: ApproveCourierDto) {
    const idNumber = Number(courierId);
    if (isNaN(idNumber)) {
      throw new BadRequestException('Invalid courier id');
    }

    return this.prisma.courier.update({
      where: { id: idNumber },
      data: { approvalStatus: dto.approvalStatus },
    });
  }

  async createCourierIfNotExists(userId: number) {
    const existing = await this.prisma.courier.findUnique({ where: { userId } });
    if (existing) return existing;

    return this.prisma.courier.create({
      data: {
        userId,
        approvalStatus: CourierApprovalStatus.PENDING,
        onlineStatus: CourierOnlineStatus.OFFLINE,
      },
    });
  }
}
