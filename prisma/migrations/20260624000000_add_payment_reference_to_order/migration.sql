-- Agrega campo paymentReference para almacenar la referencia de la pasarela de pagos
-- (p.ej. ref_payco de ePayco) para conciliación y trazabilidad.
ALTER TABLE "Order" ADD COLUMN "paymentReference" TEXT;
