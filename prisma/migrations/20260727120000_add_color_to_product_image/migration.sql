-- Color de variante al que pertenece cada foto (null = imagen general del producto)
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "color" TEXT;

CREATE INDEX IF NOT EXISTS "ProductImage_productId_color_idx" ON "ProductImage"("productId", "color");
