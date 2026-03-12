import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { OrderService } from './order.service';
import {
  CourierApprovalStatus,
  CourierOnlineStatus,
  Prisma,
  ProductStatus,
} from '@prisma/client';

describe('OrderService', () => {
  let service: OrderService;

  const prisma = {
    merchant: { findUnique: vi.fn() },
    cart: { findFirst: vi.fn(), update: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    courier: { findMany: vi.fn() },
    order: { create: vi.fn(), findUnique: vi.fn() },
    orderItem: { createMany: vi.fn() },
    $transaction: vi.fn(),
  };

  const cartServiceMock = {
    clearCart: vi.fn(),
  };

  beforeAll(async () => {
    service = new OrderService(prisma as any, cartServiceMock as any);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createFromCart should reject when cart not found', async () => {
    prisma.merchant.findUnique.mockResolvedValue({ id: 10, latitude: null, longitude: null });
    prisma.cart.findFirst.mockResolvedValue(null);

    await expect(
      service.createFromCart(1, '10', {
        deliveryAddress: {
          name: 'A',
          phone: '0123',
          addressLine: 'Addr',
        },
      })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('createFromCart should reject when cart is empty', async () => {
    prisma.merchant.findUnique.mockResolvedValue({ id: 10, latitude: null, longitude: null });
    prisma.cart.findFirst.mockResolvedValue({ id: 1, cartItems: [] });

    await expect(
      service.createFromCart(1, '10', {
        deliveryAddress: {
          name: 'A',
          phone: '0123',
          addressLine: 'Addr',
        },
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('createFromCart should reject when cart contains unpublished products', async () => {
    prisma.merchant.findUnique.mockResolvedValue({ id: 10, latitude: null, longitude: null });

    prisma.cart.findFirst.mockResolvedValue({
      id: 1,
      totalAmount: new Prisma.Decimal(100),
      cartItems: [
        {
          productId: 99,
          quantity: 1,
          price: new Prisma.Decimal(100),
          total: new Prisma.Decimal(100),
          product: { status: ProductStatus.DRAFT },
        },
      ],
    });

    await expect(
      service.createFromCart(1, 'merchant-external-id', {
        deliveryAddress: {
          name: 'A',
          phone: '0123',
          addressLine: 'Addr',
        },
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('createFromCart should create order and clear cart', async () => {
    prisma.merchant.findUnique.mockResolvedValue({ id: 10, latitude: 10, longitude: 10 });

    prisma.cart.findFirst.mockResolvedValue({
      id: 1,
      totalAmount: new Prisma.Decimal(100),
      cartItems: [
        {
          productId: 99,
          quantity: 1,
          price: new Prisma.Decimal(100),
          total: new Prisma.Decimal(100),
          product: { status: ProductStatus.PUBLISHED },
        },
      ],
    });

    prisma.courier.findMany.mockResolvedValue([
      {
        id: 7,
        latitude: 10,
        longitude: 10,
        approvalStatus: CourierApprovalStatus.APPROVED,
        onlineStatus: CourierOnlineStatus.ONLINE,
      },
    ]);

    prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {
        order: { create: vi.fn().mockResolvedValue({ id: 111 }) },
        orderItem: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
        cartItem: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
        cart: { update: vi.fn().mockResolvedValue({ id: 1 }) },
      };
      return cb(tx);
    });

    prisma.order.findUnique.mockResolvedValue({ id: 111 });

    const res = await service.createFromCart(1, '10', {
      deliveryAddress: {
        name: 'A',
        phone: '0123',
        addressLine: 'Addr',
      },
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.order.findUnique).toHaveBeenCalledWith({
      where: { id: 111 },
      include: {
        orderItems: { include: { product: true } },
        courier: true,
        merchant: true,
      },
    });

    expect(res).toEqual({ id: 111 });
  });
});
