import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';
import {
  PRODUCT_MESSAGES,
  COMMON_MESSAGES,
} from '../common/constants/messages.constant';
import { StorageService } from '../common/services/storage.service';
import { toLocalizedJson } from '../common/utils/localization.util';
import { PRODUCT_CONSTANTS } from '../common/constants/product.constant';
import { PRIMITIVE_TYPES } from '../common/constants/common.constant';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService
  ) {}

  async create(
    createProductDto: CreateProductDto,
    files?: Array<Express.Multer.File>
  ) {
    const { name, description, metadata, merchantId, ...rest } =
      createProductDto;

    const imageUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await this.storageService.uploadFile(
          file,
          PRODUCT_CONSTANTS.STORAGE_FOLDER
        );
        imageUrls.push(url);
      }
    }

    const nameJson = toLocalizedJson(name);
    const descJson = description
      ? toLocalizedJson(description)
      : Prisma.JsonNull;

    const metaObj = metadata
      ? typeof metadata === PRIMITIVE_TYPES.STRING
        ? JSON.parse(metadata as unknown as string)
        : metadata
      : {};

    if (imageUrls.length > 0) {
      metaObj[PRODUCT_CONSTANTS.METADATA.IMAGES] = imageUrls;
      if (!metaObj[PRODUCT_CONSTANTS.METADATA.THUMBNAIL]) {
        metaObj[PRODUCT_CONSTANTS.METADATA.THUMBNAIL] = imageUrls[0];
      }
    }

    const metaJson = metaObj as unknown as Prisma.InputJsonValue;

    return this.prisma.product.create({
      data: {
        ...rest,
        merchantId: merchantId as unknown as number,
        name: nameJson,
        description: descJson,
        metadata: metaJson,
      },
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        merchant: true,
      },
    });
  }

  async findAllByMerchant(
    merchantExternalId: string,
    paginationDto: PaginationDto
  ): Promise<PaginatedResult<any>> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { externalId: merchantExternalId },
    });

    if (!merchant) {
      throw new NotFoundException(COMMON_MESSAGES.INVALID_MERCHANT_ID);
    }

    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { merchantId: merchant.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {},
      }),
      this.prisma.product.count({
        where: { merchantId: merchant.id },
      }),
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

  async findOne(externalId: string) {
    const product = await this.prisma.product.findUnique({
      where: { externalId },
      include: {
        merchant: true,
      },
    });
    if (!product) {
      throw new NotFoundException(PRODUCT_MESSAGES.PRODUCT_NOT_FOUND);
    }
    return product;
  }

  async update(externalId: string, updateProductDto: UpdateProductDto) {
    await this.findOne(externalId);

    const { name, description, metadata, ...rest } = updateProductDto;

    const data: Prisma.ProductUpdateInput = {
      ...rest,
    };

    if (name) {
      data.name = toLocalizedJson(name) as unknown as Prisma.InputJsonValue;
    }
    if (description) {
      data.description = toLocalizedJson(description) as unknown as Prisma.InputJsonValue;
    }
    if (metadata) {
      const metaObj =
        typeof metadata === PRIMITIVE_TYPES.STRING
          ? JSON.parse(metadata as unknown as string)
          : metadata;
      data.metadata = metaObj as unknown as Prisma.InputJsonValue;
    }

    return this.prisma.product.update({
      where: { externalId },
      data,
    });
  }

  async remove(externalId: string) {
    await this.findOne(externalId);
    return this.prisma.product.delete({
      where: { externalId },
    });
  }
}
