-- Plazo opcional (días hábiles) para tener listo un pedido de "recoger en tienda".

ALTER TABLE "StoreSettings"
  ADD COLUMN "pickupReadyMinDays" INTEGER,
  ADD COLUMN "pickupReadyMaxDays" INTEGER;
