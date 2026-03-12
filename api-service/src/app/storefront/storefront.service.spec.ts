import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { StorefrontService } from './storefront.service';
import { ProductStatus } from '@prisma/client';

describe('StorefrontService', () => {
  let service: StorefrontService;

  const prisma = {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  };

  beforeAll(async () => {
    service = new StorefrontService(prisma as any);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('findPublishedProducts should filter by status=PUBLISHED', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(0);

    const res = await service.findPublishedProducts(
      { page: 1, limit: 10, skip: 0 },
      { categoryId: undefined, search: undefined }
    );

    expect(prisma.product.findMany).toHaveBeenCalled();

    const args = prisma.product.findMany.mock.calls[0][0];
    expect(args.where.status).toBe(ProductStatus.PUBLISHED);

    expect(res).toHaveProperty('data');
    expect(res).toHaveProperty('meta');
  });
});
