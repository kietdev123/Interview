# TASK 2 – Implement Courier Registration Flow
## 1) Business Flow (implemented)

1. **Courier request OTP** (public)
2. **Courier verify OTP** → receives a `verificationToken`
3. **Courier register** (requires JWT) → creates a courier record in DB with `PENDING`
4. **Admin review list** (Management UI)
5. **Admin approve/reject**
   - Approve: set `APPROVED`, clear rejection fields
   - Reject: set `REJECTED`, `rejectionReason` is required

---

# Part A – Database Design (10 Points)

## A1. Analyze existing Courier model vs Agency/Merchant (Must Have) – DONE

I separated the status concept into 2 parts:

- **Approval Status**: onboarding/registration review flow (moves based on approval decisions)
- **Operational Status**: long-term operational control (can change multiple times, e.g. suspended/locked)

**Related files**:

- `prisma/schema.prisma`

**Decision / rationale**:

- Agency/Merchant commonly have separate concepts for “approval” vs “operational” state; Courier needs the same.
- Avoid a single ambiguous `status` field (operating status vs approval status).

## A2. Extend schema if required fields are missing (Must Have) – DONE

Added fields to support registration, approval, and operational management:

- `approvalStatus`, `approvedAt`, `approvedBy`, `rejectedAt`, `rejectedBy`, `rejectionReason`
- `operationalStatus`, `statusChangedAt`, `statusChangedBy`, `statusReason`
- `taxCode`, `vehicleType`

Note: the DB commit also includes URL fields (`driverLicenseUrl`, `vehicleImageUrl`, `idCardUrl`) to support “document upload fields”.

**Related files**:

- `prisma/schema.prisma`

## A3. Create Prisma migration (Must Have) – DONE

A Prisma migration was created to add columns and indexes.

**Related files**:

- `prisma/migrations/20260310032723_extend_courier_registration_flow/migration.sql`

## A4. Update seed.ts with permissions courier:* and role mapping (Must Have) – DONE

Added permissions following the existing system pattern (`resource: courier`, `action: ...`) and mapped them to roles.

Added permissions:

- `courier:create`
- `courier:update`
- `courier:delete`
- `courier:update_status`
- `courier:read`

Also updated mappings for role `COURIER` (courier read/update + basic order permissions).

**Related files**:

- `prisma/seed.ts`

## A5. Add unique constraints for phone/email (Nice to Have) – NOT DONE

- I did not add a unique constraint to `couriers.phone` because the system already has `User.phone` (depending on the design, you may want to keep a strict 1-1 relationship via `userId`).
- Not enough time to finalize a single “unique phone/email” rule across `User` and `Courier`.

## A6. Add indexes to improve query performance (Nice to Have) – DONE

Added indexes to support listing/filtering by status and sorting by creation time:

- `@@index([approvalStatus, createdAt])`
- `@@index([operationalStatus, createdAt])`

**Related files**:

- `prisma/schema.prisma`
- `prisma/migrations/20260310032723_extend_courier_registration_flow/migration.sql`

## A7. Implement soft delete (Nice to Have) – NOT DONE

- The API currently uses `prisma.courier.delete()` (hard delete).
- Not enough time to refactor to soft delete (add `deletedAt` and update all queries to exclude deleted records).

---

# Part B – Backend API (10 Points)

## B1. Create Courier module following architecture (Must Have) – DONE

Implemented the module following the existing system architecture:

- **Module**: wiring dependencies
- **Controller**: routing + guards + permissions
- **Service**: business logic (register/CRUD/approve/reject)
- **DTOs**: validate input
- **Entity**: response shaping + exclude sensitive fields
- **QueryBuilder**: build Prisma `where` object

**Related files**:

- `api-service/src/app/courier/courier.module.ts`
- `api-service/src/app/courier/courier.controller.ts`
- `api-service/src/app/courier/courier.service.ts`
- `api-service/src/app/courier/builders/courier-query.builder.ts`
- `api-service/src/app/courier/dto/*`
- `api-service/src/app/courier/entities/courier.entity.ts`

## B2. Implement OTP registration flow similar to Agency registration (Must Have) – DONE

Endpoints:

- `POST /couriers/otp/request`
- `POST /couriers/otp/verify`
- `POST /couriers/register` (requires JWT)

**Core logic**:

- `verifyOtp` returns a `verificationToken` (JWT) with `type = COURIER_REGISTRATION_OTP`.
- `register()` verifies the token:
  - token is valid, correct type, and `payload.phone === dto.phone`
  - if invalid → `UnauthorizedException`
  - if valid → creates a `courier` with `approvalStatus = PENDING`

**Related files**:

- `api-service/src/app/courier/courier.controller.ts`
- `api-service/src/app/courier/courier.service.ts`
- `api-service/src/app/otp/otp.service.ts` (extended to support rate limiting)

## B3. CRUD APIs for courier management (Must Have) – DONE

Admin CRUD endpoints:

- `POST /couriers/admin-create` (permission `courier:create`)
- `GET /couriers` (permission `courier:read`)
- `GET /couriers/:id` (permission `courier:read`)
- `PATCH /couriers/:id` (permission `courier:update`)
- `DELETE /couriers/:id` (permission `courier:delete`)

**Decision / rationale**:

- `admin-create` exists to allow Admin to create an already-approved courier (fits management tooling use cases).
- During `adminCreate`, the service assigns role `COURIER` to `userId` (if missing) so the user receives courier permissions.

## B4. Admin approval + rejection endpoints (Must Have) – DONE

- `PATCH /couriers/:id/approve` (permission `courier:update_status`)
- `PATCH /couriers/:id/reject` (permission `courier:update_status`)

**Logic**:

- Approve:
  - if courier does not exist → 404
  - if already `APPROVED` → return unchanged (idempotent)
  - otherwise → update status + set `approvedAt/approvedBy`, clear rejection fields
- Reject:
  - validate reason is required (trim)
  - if already `REJECTED` → return unchanged (idempotent)
  - otherwise → update status + set `rejectedAt/rejectedBy/rejectionReason`, clear approval fields

**Related files**:

- `api-service/src/app/courier/courier.service.ts`
- `api-service/src/app/courier/dto/reject-courier.dto.ts`

## B5. Rejection must include rejection reason (Must Have) – DONE

Backend enforcement:

- DTO `RejectCourierDto` requires `reason`
- Service checks `reason?.trim()` and throws `BadRequestException`

## B6. Validation + role-based authorization (Must Have) – DONE

- `JwtAuthGuard` protects the endpoints.
- `PermissionsGuard` + `@Permissions()` decorator enforces authorization based on seeded permissions.
- DTOs use `class-validator` for input validation.

**Related files**:

- `api-service/src/app/courier/courier.controller.ts`
- `api-service/src/app/courier/dto/*`

## B7. Unit tests for approval flow (Must Have) – DONE (E2E style)

I implemented **e2e/integration-style** tests under `api-service-e2e` to cover the full flow:

- OTP request + verify
- register courier → `PENDING`
- admin approve/reject
- CRUD + list search
- negative cases (invalid otp, invalid token, non-admin)
- idempotent approve/reject

**Related files**:

- `api-service-e2e/src/api-service/courier.spec.ts`
- `api-service-e2e/src/support/test-setup.ts`

## B8. Add OTP expiration + rate limiting (Nice to Have) – DONE (rate limit)

- OTP expiration: `expiresAt` is already present (5 minutes) in OTP logic.
- Rate limiting: counts requests within a window (default 5 minutes, max 3) and throws `OTP_RATE_LIMITED`.

**Related files**:

- `api-service/src/app/otp/otp.service.ts`

## B9. Ensure approval endpoints are idempotent (Nice to Have) – DONE

- `approve()` returns the current courier if it is already `APPROVED`
- `reject()` returns the current courier if it is already `REJECTED`

**Related files**:

- `api-service/src/app/courier/courier.service.ts`
- `api-service-e2e/src/api-service/courier.spec.ts`

## B10. Add audit logging for approval actions (Nice to Have) – DONE (stored in `courier` table)

Instead of introducing a separate audit-log table, this implementation records approval-related audit information directly on the `courier` record:

- Approve action writes:
  - `approvalStatus = APPROVED`
  - `approvedAt`, `approvedBy`
  - Clears rejection fields: `rejectedAt`, `rejectedBy`, `rejectionReason`
- Reject action writes:
  - `approvalStatus = REJECTED`
  - `rejectedAt`, `rejectedBy`, `rejectionReason`
  - Clears approval fields: `approvedAt`, `approvedBy`

This provides a minimal but practical audit trail (who approved/rejected and when) with low implementation overhead.

**Related files**:

- Schema & migration: `prisma/schema.prisma`, `prisma/migrations/20260310032723_extend_courier_registration_flow/migration.sql`
- Business logic: `api-service/src/app/courier/courier.service.ts`

---

# Part C – Frontend Management (10 Points)

## C1. Pending Courier Approvals page (Must Have) – DONE

Implemented a courier management page in `front-management`.

**Related files**:

- `front-management/src/app/pages/users/couriers/couriers.component.ts`
- `front-management/src/app/pages/users/couriers/couriers.component.html`
- `front-management/src/app/pages/users/couriers/couriers.component.scss`
- `front-management/src/app/pages/users/couriers/couriers.config.ts`
- `front-management/src/app/app.routes.ts` (routing)

## C2. Admin approve couriers directly from list (Must Have) – DONE

- Table action `Approve` calls `CourierService.approve(id)`.
- Optimistic UI updates (remove item from list when filter is `PENDING`).
- Confirm popup (GlobalModalService) before executing.
- Success/fail notification via GlobalModal.

**Related files**:

- `front-management/src/app/pages/users/couriers/couriers.component.ts`
- `shared/src/lib/services/courier.service.ts`

## C3. Reject courier via modal input for rejection reason (Must Have) – DONE

- Reject action opens a modal to enter a rejection reason.
- Reason is required (frontend checks empty → shows error modal).
- When submitting reject:
  - confirm popup
  - optimistic update
  - calls reject API
  - shows success/fail modal

**Related files**:

- `front-management/src/app/pages/users/couriers/couriers.component.ts`
- `front-management/src/app/pages/users/couriers/couriers.component.html`

## C4. Unit tests for component (Must Have) – DONE

Unit tests cover:

- load couriers on init
- approve triggers API
- reject reason required (showError)
- reject failure path
- open edit panel loads detail

**Related files**:

- `front-management/src/app/pages/users/couriers/couriers.component.spec.ts`

## C5. Pagination (Nice to Have) – DONE

- Backend supports `page/limit`, FE table emits `(pageChange)`.

**Related files**:

- `api-service/src/app/courier/dto/courier-query.dto.ts`
- `api-service/src/app/courier/courier.service.ts`
- `front-management/src/app/pages/users/couriers/couriers.component.ts`

## C6. Filtering by registration date or status (Nice to Have) – PARTIAL

- Status filter: có (approvalStatus).
- Registration date filter: backend date-range filtering was not implemented (the FE currently does not use a date filter).

Reason: not enough time to finalize UX, add query params, and design the index strategy for date-range filtering.

## C7. Toast notifications after approve/reject (Nice to Have) – DONE (via Global Modal)

Instead of having page-local toasts, this implementation uses **GlobalModalService** for consistent notifications:

- `showSuccess(titleKey, messageKey)`
- `showError(titleKey, messageKey)`

**Related files**:

- `front-management/src/app/shared/components/global-modal/global-modal.service.ts`
- `front-management/src/app/pages/users/couriers/couriers.component.ts`
- i18n: `front-management/src/assets/i18n/{en,vi,ko}.json`

## C8. Optimistic UI updates (Nice to Have) – DONE

In `CouriersComponent.optimisticUpdate()`:

- updates the status immediately on the UI
- if the current filter is `PENDING`, removes the row from the list for a faster UX
- if the API call fails → reloads the list from the server
