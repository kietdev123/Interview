import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@UseGuards(JwtAuthGuard)
@Controller('carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('merchant/:merchantId')
  getMyCartByMerchant(@Request() req, @Param('merchantId') merchantId: string) {
    return this.cartService.getCartByMerchant(req.user.userId, merchantId);
  }

  @Post('merchant/:merchantId/items')
  addItem(
    @Request() req,
    @Param('merchantId') merchantId: string,
    @Body() dto: AddCartItemDto
  ) {
    return this.cartService.addItem(req.user.userId, merchantId, dto);
  }

  @Patch('items/:id')
  updateItem(@Request() req, @Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItem(req.user.userId, id, dto);
  }

  @Delete('items/:id')
  removeItem(@Request() req, @Param('id') id: string) {
    return this.cartService.removeItem(req.user.userId, id);
  }
}
