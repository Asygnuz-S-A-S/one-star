-- Relación local y opcional; no modifica ni agrupa datos existentes.
CREATE TABLE "ProductColorFamily" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductColorFamily_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product" ADD COLUMN "colorFamilyId" TEXT;

CREATE INDEX "Product_colorFamilyId_idx" ON "Product"("colorFamilyId");

ALTER TABLE "Product"
ADD CONSTRAINT "Product_colorFamilyId_fkey"
FOREIGN KEY ("colorFamilyId") REFERENCES "ProductColorFamily"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Rollback documentado para entornos no productivos:
-- ALTER TABLE "Product" DROP CONSTRAINT "Product_colorFamilyId_fkey";
-- DROP INDEX "Product_colorFamilyId_idx";
-- ALTER TABLE "Product" DROP COLUMN "colorFamilyId";
-- DROP TABLE "ProductColorFamily";
