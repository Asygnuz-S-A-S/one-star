-- Reserva de stock del checkout: el pedido descuenta sus unidades al crearse y
-- las devuelve si nadie empieza a pagar antes de stockReservedUntil.
-- Los pedidos existentes quedan sin reserva (false), así que el pago los sigue
-- descontando como antes.
ALTER TABLE "Order" ADD COLUMN "stockReserved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "stockReservedUntil" TIMESTAMP(3);
CREATE INDEX "Order_stockReserved_stockReservedUntil_idx" ON "Order"("stockReserved", "stockReservedUntil");
