-- Tarifas de envío y datos legales editables desde /admin/configuracion.
-- Los defaults coinciden con lo que ya cobraba la tienda.

ALTER TABLE "StoreSettings"
  ADD COLUMN "freeShippingThreshold" INTEGER NOT NULL DEFAULT 200000,
  ADD COLUMN "standardShippingCost" INTEGER NOT NULL DEFAULT 15000,
  ADD COLUMN "expressShippingCost" INTEGER NOT NULL DEFAULT 25000,
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "taxId" TEXT,
  ADD COLUMN "legalAddress" TEXT,
  ADD COLUMN "contactPhone" TEXT;
