import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { CartService } from './cart.service';
import { ProductStatus, Prisma } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    product: { findFirst: any };
    merchant: { findUnique: any };
    cart: { findFirst: any; create: any; update: any; findUnique: any };
    cartItem: {
      findFirst: any;
      create: any;
      update: any;
      delete: any;
      aggregate: any;
      findUnique: any;
      deleteMany: any;
    };
  };

  beforeAll(async () => {
    prisma = {
      product: { findFirst: vi.fn() },
      merchant: { findUnique: vi.fn() },
      cart: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      cartItem: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        aggregate: vi.fn(),
        findUnique: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    service = new CartService(prisma as any);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addItem should reject when product not found or not PUBLISHED', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.addItem(1, '10', {
        productExternalId: 'prod-1',
        quantity: 1,
      })
    ).rejects.toMatchObject({
      status: 404,
    });

    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: {
        externalId: 'prod-1',
        merchantId: 10,
        status: ProductStatus.PUBLISHED,
      },
    });
  });

  it('addItem should create cart if not exists and recalculate total', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 99,
      externalId: 'prod-1',
      merchantId: 10,
      status: ProductStatus.PUBLISHED,
      stock: 10,
      price: new Prisma.Decimal(100),
    });

    prisma.cart.findFirst.mockResolvedValue(null);
    prisma.cart.create.mockResolvedValue({ id: 123, userId: 1, merchantId: 10 });

    prisma.cartItem.findFirst.mockResolvedValue(null);
    prisma.cartItem.create.mockResolvedValue({ id: 1 });

    prisma.cartItem.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(200) } });
    prisma.cart.update.mockResolvedValue({ id: 123 });

    prisma.cart.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 123,
      userId: 1,
      merchantId: 10,
      totalAmount: new Prisma.Decimal(200),
      cartItems: [],
    });

    const res = await service.addItem(1, '10', {
      productExternalId: 'prod-1',
      quantity: 2,
    });

    expect(prisma.cart.create).toHaveBeenCalled();
    expect(prisma.cartItem.create).toHaveBeenCalled();
    expect(prisma.cartItem.aggregate).toHaveBeenCalledWith({
      where: { cartId: 123 },
      _sum: { total: true },
    });
    expect(prisma.cart.update).toHaveBeenCalledWith({
      where: { id: 123 },
      data: { totalAmount: new Prisma.Decimal(200) },
    });

    expect(res).toHaveProperty('data');
  });
});
