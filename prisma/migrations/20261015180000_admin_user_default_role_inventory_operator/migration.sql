-- AlterTable
-- Cambia el valor por defecto de AdminUser.role a INVENTORY_OPERATOR (principio de menor privilegio)
-- No modifica registros existentes.
ALTER TABLE "AdminUser" ALTER COLUMN "role" SET DEFAULT 'INVENTORY_OPERATOR';
