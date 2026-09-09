-- Estado del pago separado del estado logístico del pedido.
-- Las columnas usan IF NOT EXISTS para poder aplicarse sobre una base que
-- ya las tenga (como 20260729180000_sync_schema_drift).

-- CreateEnum
-- Sin bloque DO: el gate de seguridad (scripts/check-migration-safety.ts)
-- rechaza SQL procedural top-level. El tipo es nuevo, así que CREATE TYPE
-- directo es seguro en cualquier base que reciba esta migración.
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

-- Backfill: los pedidos que ya avanzaron en el flujo logístico tuvieron el pago
-- confirmado antes de esta migración. Los PENDING y CANCELLED se quedan como
-- "sin pago confirmado", que es exactamente lo que eran.
UPDATE "Order"
SET "paymentStatus" = 'APPROVED',
    "paidAt" = COALESCE("paidAt", "updatedAt")
WHERE "status" IN ('PAID', 'SHIPPED', 'DELIVERED')
  AND "paymentStatus" = 'PENDING';
