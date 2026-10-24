-- Plazo de entrega, documentos legales, montos de tarjeta, barra inferior y cuentas de admin activas.

ALTER TABLE "StoreSettings"
  ADD COLUMN "bottomNav" TEXT,
  ADD COLUMN "deliveryMinDays" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "deliveryMaxDays" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "expressDeliveryMinDays" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "expressDeliveryMaxDays" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "legalCity" TEXT,
  ADD COLUMN "commercialRegistry" TEXT,
  ADD COLUMN "dataProtectionEmail" TEXT,
  ADD COLUMN "termsDocumentUrl" TEXT,
  ADD COLUMN "privacyDocumentUrl" TEXT,
  ADD COLUMN "returnsDocumentUrl" TEXT,
  ADD COLUMN "giftCardAmounts" TEXT;

ALTER TABLE "AdminUser" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
