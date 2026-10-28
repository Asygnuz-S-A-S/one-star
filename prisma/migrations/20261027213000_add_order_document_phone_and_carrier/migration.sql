-- CreateEnum
CREATE TYPE "ShippingCarrier" AS ENUM ('ENVIA', 'OTHER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "carrier" "ShippingCarrier",
ADD COLUMN     "customerDocument" TEXT,
ADD COLUMN     "customerDocumentType" TEXT,
ADD COLUMN     "customerPhone" TEXT;

-- CreateIndex
CREATE INDEX "Order_customerDocument_idx" ON "Order"("customerDocument");

-- CreateIndex
CREATE INDEX "Order_customerPhone_idx" ON "Order"("customerPhone");

-- Backfill customerPhone and customerDocument from shippingAddress if available
UPDATE "Order"
SET
  "customerPhone" = RIGHT(REGEXP_REPLACE(COALESCE("shippingAddress"->>'phone', ''), '\D', '', 'g'), 10),
  "customerDocument" = REGEXP_REPLACE(COALESCE("shippingAddress"->>'cedula', ''), '\D', '', 'g'),
  "customerDocumentType" = CASE WHEN "shippingAddress"->>'cedula' IS NOT NULL AND "shippingAddress"->>'cedula' <> '' THEN 'CC' ELSE NULL END
WHERE "customerPhone" IS NULL AND "shippingAddress" IS NOT NULL;

-- Cleanup empty strings from backfill to NULL
UPDATE "Order"
SET "customerPhone" = NULL
WHERE "customerPhone" = '';

UPDATE "Order"
SET "customerDocument" = NULL
WHERE "customerDocument" = '';
