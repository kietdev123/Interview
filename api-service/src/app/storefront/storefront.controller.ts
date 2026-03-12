import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { StorefrontService } from './storefront.service';

@UseGuards(JwtAuthGuard)
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('products')
  findProducts(
    @Query() paginationDto: PaginationDto,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string
  ) {
    return this.storefrontService.findPublishedProducts(paginationDto, {
      categoryId,
      search,
    });
  }

  @Get('products/:externalId')
  findProductDetail(@Param('externalId') externalId: string) {
    return this.storefrontService.findPublishedProductByExternalId(externalId);
  }
}
