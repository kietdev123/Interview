import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PRODUCT_MESSAGES } from '../common/constants/messages.constant';

@Injectable()
export class StorefrontService {
  constructor(private prisma: PrismaService) {}

  async findPublishedProducts(
    paginationDto: PaginationDto,
    filters: { categoryId?: string; search?: string }
  ) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const categoryIdNumber = filters.categoryId
      ? Number(filters.categoryId)
      : undefined;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.PUBLISHED,
      ...(categoryIdNumber ? { categoryId: categoryIdNumber } : {}),
    };

    if (filters.search) {
      const q = filters.search;
      where.OR = [
        {
          name: {
            path: ['vi'],
            string_contains: q,
            mode: 'insensitive',
          },
        },
        {
          name: {
            path: ['en'],
            string_contains: q,
            mode: 'insensitive',
          },
        },
        {
          name: {
            path: ['ko'],
            string_contains: q,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: true,
          category: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async findPublishedProductByExternalId(externalId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        externalId,
        status: ProductStatus.PUBLISHED,
      },
      include: {
        merchant: true,
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_MESSAGES.PRODUCT_NOT_FOUND);
    }

    return product;
  }
}
