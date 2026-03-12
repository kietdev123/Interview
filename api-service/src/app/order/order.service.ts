import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourierApprovalStatus,
  CourierOnlineStatus,
  Prisma,
  ProductStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { COMMON_MESSAGES } from '../common/constants/messages.constant';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService, private cartService: CartService) {}

  async createFromCart(userId: number, merchantId: string, dto: CreateOrderDto) {
    const merchantIdNumber = await this.resolveMerchantId(merchantId);

    const cart = await this.prisma.cart.findFirst({
      where: {
        userId,
        merchantId: merchantIdNumber,
      },
      include: {
        cartItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (!cart.cartItems || cart.cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.cartItems) {
      if (item.product.status !== ProductStatus.PUBLISHED) {
        throw new BadRequestException('Cart contains unpublished products');
      }
    }

    const totalAmount = cart.totalAmount ?? new Prisma.Decimal(0);

    const courierId = await this.selectCourierId(merchantIdNumber);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          merchantId: merchantIdNumber,
          totalAmount,
          currency: 'VND',
          status: 'pending',
          paymentStatus: 'pending',
          deliveryAddress: dto.deliveryAddress as unknown as Prisma.InputJsonValue,
          courierId,
          shippingFee: new Prisma.Decimal(0),
        },
      });

      await tx.orderItem.createMany({
        data: cart.cartItems.map((ci) => ({
          orderId: created.id,
          productId: ci.productId,
          quantity: ci.quantity,
          price: ci.price,
          total: ci.total,
        })),
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { totalAmount: new Prisma.Decimal(0) },
      });

      return created;
    });

    return this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: {
          include: { product: true },
        },
        courier: true,
        merchant: true,
      },
    });
  }

  private async selectCourierId(merchantId: number): Promise<number | null> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { latitude: true, longitude: true },
    });

    const eligible = await this.prisma.courier.findMany({
      where: {
        approvalStatus: CourierApprovalStatus.APPROVED,
        onlineStatus: CourierOnlineStatus.ONLINE,
      },
      select: { id: true, latitude: true, longitude: true },
    });

    if (eligible.length === 0) {
      return null;
    }

    if (
      merchant?.latitude === null ||
      merchant?.latitude === undefined ||
      merchant?.longitude === null ||
      merchant?.longitude === undefined
    ) {
      return eligible[0].id;
    }

    const candidates = eligible.filter(
      (c) => c.latitude !== null && c.latitude !== undefined && c.longitude !== null && c.longitude !== undefined
    );

    if (candidates.length === 0) {
      return eligible[0].id;
    }

    let best = candidates[0];
    let bestDist = this.haversine(
      merchant.latitude,
      merchant.longitude,
      best.latitude as number,
      best.longitude as number
    );

    for (const c of candidates.slice(1)) {
      const d = this.haversine(
        merchant.latitude,
        merchant.longitude,
        c.latitude as number,
        c.longitude as number
      );
      if (d < bestDist) {
        best = c;
        bestDist = d;
      }
    }

    return best.id;
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
}
