import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { COMMON_MESSAGES, PRODUCT_MESSAGES } from '../common/constants/messages.constant';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCartByMerchant(userId: number, merchantId: string) {
    const merchantIdNumber = await this.resolveMerchantId(merchantId);

    const cart = await this.prisma.cart.findFirst({
      where: { userId, merchantId: merchantIdNumber },
      include: {
        cartItems: {
          include: {
            product: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!cart) {
      return {
        data: null,
      };
    }

    return { data: cart };
  }

  async addItem(userId: number, merchantId: string, dto: AddCartItemDto) {
    const merchantIdNumber = await this.resolveMerchantId(merchantId);

    const product = await this.prisma.product.findFirst({
      where: {
        externalId: dto.productExternalId,
        merchantId: merchantIdNumber,
        status: ProductStatus.PUBLISHED,
      },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_MESSAGES.PRODUCT_NOT_FOUND);
    }

    const quantity = dto.quantity ?? 1;

    if (product.stock !== null && product.stock !== undefined && quantity > product.stock) {
      throw new BadRequestException('Quantity exceeds product stock');
    }

    let cart = await this.prisma.cart.findFirst({
      where: {
        userId,
        merchantId: merchantIdNumber,
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          userId,
          merchantId: merchantIdNumber,
          totalAmount: new Prisma.Decimal(0),
        },
      });
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: product.id,
      },
    });

    const price = product.price ?? new Prisma.Decimal(0);

    if (existingItem) {
      const newQty = (existingItem.quantity ?? 0) + quantity;

      if (product.stock !== null && product.stock !== undefined && newQty > product.stock) {
        throw new BadRequestException('Quantity exceeds product stock');
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQty,
          price,
          total: price.mul(newQty),
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity,
          price,
          total: price.mul(quantity),
        },
      });
    }

    await this.recalculateCartTotal(cart.id);

    return this.getCartByMerchant(userId, merchantId);
  }

  async updateItem(userId: number, cartItemId: string, dto: UpdateCartItemDto) {
    const idNumber = Number(cartItemId);
    if (isNaN(idNumber)) {
      throw new BadRequestException('Invalid cart item id');
    }

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: idNumber },
      include: {
        cart: true,
        product: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.cart.userId !== userId) {
      throw new ForbiddenException(COMMON_MESSAGES.USER_NOT_FOUND_IN_CONTEXT);
    }

    const quantity = dto.quantity;
    const product = cartItem.product;

    if (product.stock !== null && product.stock !== undefined && quantity > product.stock) {
      throw new BadRequestException('Quantity exceeds product stock');
    }

    const price = cartItem.price ?? new Prisma.Decimal(0);

    await this.prisma.cartItem.update({
      where: { id: cartItem.id },
      data: {
        quantity,
        total: price.mul(quantity),
      },
    });

    await this.recalculateCartTotal(cartItem.cartId);

    return this.prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      include: {
        cartItems: {
          include: { product: true },
          orderBy: { id: 'asc' },
        },
      },
    });
  }

  async removeItem(userId: number, cartItemId: string) {
    const idNumber = Number(cartItemId);
    if (isNaN(idNumber)) {
      throw new BadRequestException('Invalid cart item id');
    }

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: idNumber },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.cart.userId !== userId) {
      throw new ForbiddenException(COMMON_MESSAGES.USER_NOT_FOUND_IN_CONTEXT);
    }

    await this.prisma.cartItem.delete({ where: { id: cartItem.id } });
    await this.recalculateCartTotal(cartItem.cartId);

    return { message: 'Removed' };
  }

  async clearCart(cartId: number) {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { totalAmount: new Prisma.Decimal(0) },
    });
  }

  private async resolveMerchantId(merchantId: string): Promise<number> {
    const isUuid = merchantId.length > 20;

    if (isUuid) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { externalId: merchantId },
        select: { id: true },
      });

      if (!merchant) {
        throw new BadRequestException(COMMON_MESSAGES.INVALID_MERCHANT_ID);
      }

      return merchant.id;
    }

    const id = Number(merchantId);
    if (isNaN(id)) {
      throw new BadRequestException(COMMON_MESSAGES.INVALID_MERCHANT_ID_FORMAT);
    }

    return id;
  }

  private async recalculateCartTotal(cartId: number) {
    const agg = await this.prisma.cartItem.aggregate({
      where: { cartId },
      _sum: { total: true },
    });

    const total = agg._sum.total ?? new Prisma.Decimal(0);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { totalAmount: total },
    });
  }
}
