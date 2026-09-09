-- Estado del pago separado del estado logístico del pedido.
-- Escrita idempotente (como 20260729180000_sync_schema_drift) para poder
-- aplicarse en bases que ya tengan parte de los objetos.

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'EXPIRED');
  END IF;
END
$$;

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
