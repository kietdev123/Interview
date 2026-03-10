-- AlterTable
ALTER TABLE "couriers" ADD COLUMN     "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" INTEGER,
ADD COLUMN     "driver_license_url" TEXT,
ADD COLUMN     "id_card_url" TEXT,
ADD COLUMN     "operational_status" "OperationalStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejected_by" INTEGER,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "status_changed_at" TIMESTAMP(3),
ADD COLUMN     "status_changed_by" INTEGER,
ADD COLUMN     "status_reason" TEXT,
ADD COLUMN     "tax_code" TEXT,
ADD COLUMN     "vehicle_image_url" TEXT;

-- CreateIndex
CREATE INDEX "couriers_approval_status_created_at_idx" ON "couriers"("approval_status", "created_at");

-- CreateIndex
CREATE INDEX "couriers_operational_status_created_at_idx" ON "couriers"("operational_status", "created_at");
