# TASK 3 – Merchant Product Flow & B2C Display
## Part A – Backend Requirements (10 Points)

This document explains what I implemented for **Task 3** (backend side), why I implemented it that way, and where the relevant code lives.

Base API prefix: `http://localhost:3000/api`

## 1) Merchant must have APPROVED status before creating products (Must Have)

### What I did
I enforced **merchant approval status = APPROVED** before allowing product creation.

### How it works
- Product creation endpoint is guarded by a reusable guard: `ResourceStatusGuard`.
- The controller declares which resource should be status-checked using `@CheckStatus(RESOURCE_TARGETS.MERCHANT)`.
- The guard extracts the merchant identifier from request (query/body/params) and loads the merchant record from DB.
- If `approvalStatus !== APPROVED`, it throws `403 Forbidden`.

### Why this approach
- The status validation is a cross-cutting concern that may be reused for other resources (e.g., agency). A dedicated guard keeps controllers/services clean and consistent.

### Related endpoints
- `POST /products?merchantId=...`

### Related files
- `api-service/src/app/product/product.controller.ts`
- `api-service/src/app/common/guards/resource-status.guard.ts`
- `api-service/src/app/common/decorators/check-status.decorator.ts`
- `api-service/src/app/common/constants/resource.constant.ts`

## 2) API must validate that the user role is MERCHANT_OWNER (Must Have)

### What I did
I enforced that **only users who are MERCHANT_OWNER of the target merchant** (or the owning agency owner, if applicable) can create products for that merchant.

### How it works
The `MerchantOwnershipPipe` validates the request *before* calling `ProductService.create()`:
- Reads `merchantId` from body, or falls back to query `merchantId`.
- Resolves merchant id into **internal numeric merchant id** (supports both numeric id and external id).
- Checks whether the current user has a `userRole` row with:
  - same `userId`
  - same `merchantId`
  - role name = `MERCHANT_OWNER`
- If not found, it also allows the **agency owner** (if merchant belongs to an agency).
- If validation passes, it injects `merchantId` (internal numeric) back into DTO so the service can write to DB safely.

### Why this approach
- Guard vs Pipe: role-and-ownership checks depend on request payload (`merchantId`) and DTO transformation (convert external id to internal id). A request-scoped pipe is a clean place to both validate and normalize data.

### Related endpoints
- `POST /products?merchantId=...`

### Related files
- `api-service/src/app/common/pipes/merchant-ownership.pipe.ts`
- `api-service/src/app/common/constants/role.constants.ts`

## 3) Merchant Owners can only create products for their own store (Must Have)

### What I did
I enforced merchant ownership at creation time (same logic as section 2) and also enforced ownership on update/delete.

### How it works
- **Create**: `MerchantOwnershipPipe` prevents creating for a merchant that is not linked to the current user.
- **Update/Delete**: `ProductOwnershipGuard` loads product by externalId and checks:
  - Merchant must still be `APPROVED`
  - Current user must be either:
    - merchant owner (`merchant.ownerId === user.userId`), or
    - agency owner (`merchant.agency.ownerId === user.userId`)

### Related endpoints
- `PATCH /products/:id` (also used to update product `status` to PUBLISHED)
- `DELETE /products/:id`

### Related files
- `api-service/src/app/product/guards/product-ownership.guard.ts`
- `api-service/src/app/product/product.controller.ts`

## 4) Implement pagination for product listing APIs (Must Have)

### What I did
I implemented pagination using `PaginationDto` (`page`, `limit`) and returning a standard `{ data, meta }` response.

### Implemented APIs
- **B2C storefront listing**: `GET /storefront/products?page=1&limit=10&categoryId=&search=`
- **Merchant product listing**: `GET /products/merchant/:merchantExternalId?page=1&limit=10`

### How it works
- Parse `page`, `limit` and compute `skip = (page - 1) * limit`.
- Use Prisma `findMany({ skip, take: limit })` and `count()` in parallel.
- Return `meta = { total, page, lastPage, limit }`.

### Related files
- `api-service/src/app/common/dto/pagination.dto.ts`
- `api-service/src/app/storefront/storefront.service.ts`
- `api-service/src/app/storefront/storefront.controller.ts`
- `api-service/src/app/product/product.service.ts`
- `api-service/src/app/product/product.controller.ts`

## 5) Only couriers with status APPROVED and ONLINE are eligible (Must Have)

### What I did
During order creation, I filtered couriers by:
- `approvalStatus = APPROVED`
- `onlineStatus = ONLINE`

### How it works
In `OrderService.selectCourierId()`:
- Query `courier.findMany()` with the eligibility condition above.
- If none found, set `courierId = null` (order can still be created).

### Why this approach
- Eligibility should be enforced by the order assignment logic (single authoritative place), not scattered across controllers.

### Related files
- `api-service/src/app/order/order.service.ts`

## 6) Implement logic for selecting the nearest courier during order creation (Nice to Have)

### Status: Implemented

### What I did
I implemented a basic nearest-courier selection using **Haversine distance**.

### How it works
- Load merchant’s coordinates (`merchant.latitude`, `merchant.longitude`).
- Filter eligible couriers that have non-null coordinates.
- Compute distance for each courier using `haversine()`.
- Pick the courier with the smallest distance.

### Limitations
- This is computed in application memory (not geo-index optimized). With large courier volume, you would normally move this to PostGIS / geo index.

### Related files
- `api-service/src/app/order/order.service.ts`

## 7) Add product status: DRAFT / PUBLISHED / ARCHIVED (Nice to Have)

### Status: Implemented

### What I did
- Product status uses Prisma enum `ProductStatus`.
- Storefront only shows `PUBLISHED` products.
- Cart and order creation validate that products are `PUBLISHED`.
- Merchant can publish product by calling `PATCH /products/:id` with `{ "status": "PUBLISHED" }`.

### Related endpoints
- `POST /products?merchantId=...` (can create with `status: DRAFT`)
- `PATCH /products/:id` (update status)
- `GET /storefront/products` (only PUBLISHED)

### Related files
- `prisma/schema.prisma` (enum definition)
- `api-service/src/app/storefront/storefront.service.ts`
- `api-service/src/app/cart/cart.service.ts`
- `api-service/src/app/order/order.service.ts`
- `api-service/src/app/product/product.service.ts`

## 8) Add full-text search capability (Nice to Have)

### Status: Partially implemented (basic search)

### What I did
I added a simple `search` query param for storefront listing:
- `GET /storefront/products?search=banh`

### How it works
- Uses Prisma JSON filtering on the localized `name` field with `string_contains` against `vi/en/ko` paths.

### Why it is not “full-text” yet
- This is not a database full-text index.
- It does not use ranking, stemming, typo tolerance, or indexes specialized for search.

### Related files
- `api-service/src/app/storefront/storefront.service.ts`

## 9) Use caching (e.g., Redis) to optimize product listing (Nice to Have)

### Status: Not implemented (not enough time)

If I had more time:
- Add Redis (or Nest cache manager) and cache `GET /storefront/products` by `(page, limit, categoryId, search)`.
- Invalidate cache on `POST /products`, `PATCH /products/:id`, and relevant merchant status updates.

## 10) Use geo-indexing or PostGIS for efficient courier selection (Nice to Have)

### Status: Not implemented (not enough time)

If I had more time:
- Enable PostGIS and store courier location as `geography(Point, 4326)`.
- Query nearest courier using `ST_Distance` / `ORDER BY <->` with proper index.
- Keep current Haversine logic as a fallback for non-PostGIS environments.

## Supporting QA / Validation

### Automated tests
- Unit tests (Vitest) were added/updated for Task 3 related services.
- E2E tests were added in a separate file to avoid overwriting the default smoke test.

Related files:
- `api-service/src/app/cart/cart.service.spec.ts`
- `api-service/src/app/order/order.service.spec.ts`
- `api-service/src/app/storefront/storefront.service.spec.ts`
- `api-service-e2e/src/api-service/task3.e2e.spec.ts`

### Postman / Manual testing
- Postman collection: `TASK_3_API_COLLECTION.postman_collection.json`
- Manual tutorial: `TASK_3_API_MANUAL_TEST.md`