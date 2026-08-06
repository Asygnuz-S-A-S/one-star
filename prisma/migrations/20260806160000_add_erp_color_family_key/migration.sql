-- Clave opaca derivada por el adaptador ERP. Es nullable para no alterar
-- productos existentes ni obligar a reconocer formatos inseguros.
ALTER TABLE "Product" ADD COLUMN "erpColorFamilyKey" TEXT;

-- Marca únicamente familias creadas automáticamente. Las familias manuales
-- conservan NULL y siempre tienen precedencia durante la reconciliación.
ALTER TABLE "ProductColorFamily" ADD COLUMN "erpColorFamilyKey" TEXT;

CREATE INDEX "Product_erpColorFamilyKey_idx" ON "Product"("erpColorFamilyKey");
CREATE UNIQUE INDEX "ProductColorFamily_erpColorFamilyKey_key"
  ON "ProductColorFamily"("erpColorFamilyKey");
