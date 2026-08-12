-- Sincroniza las migraciones versionadas con prisma/schema.prisma.
--
-- Contexto: durante el desarrollo se aplicaron cambios de esquema a las bases
-- locales sin generar la migración correspondiente (probablemente con
-- `prisma db push`). El resultado es que las 9 migraciones del repo NO
-- reproducían el schema completo: al crear una base limpia faltaban 9 tablas,
-- 11 columnas y 1 enum, y `prisma db seed` fallaba con
-- P2022 "The column `Category.createdAt` does not exist in the current database".
--
-- Todas las sentencias son IDEMPOTENTES a propósito: esta migración debe poder
-- aplicarse tanto sobre una base nueva (donde crea todo) como sobre una base de
-- desarrollo que ya tiene estos objetos (donde no hace nada). Sin eso, correr
-- `migrate deploy` en las máquinas del equipo fallaría con "ya existe".

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "LandingSectionType" AS ENUM ('HERO', 'CATEGORY_GRID', 'FEATURED_PRODUCTS', 'BRAND_STRIP', 'NEW_ARRIVALS', 'NEWSLETTER', 'CUSTOM_HTML', 'PRODUCT_CAROUSEL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "mediaType" TEXT NOT NULL DEFAULT 'image';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
-- Product.brand (texto libre) se normalizó a la relación Product.brandId → Brand.
ALTER TABLE "Product" DROP COLUMN IF EXISTS "brand",
ADD COLUMN IF NOT EXISTS "availableInStores" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "availableOnline" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "brandId" TEXT,
ADD COLUMN IF NOT EXISTS "erpId" TEXT,
ADD COLUMN IF NOT EXISTS "unitOfMeasure" TEXT;

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN IF NOT EXISTS "erpId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "erpId" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryLevel" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "storeLocationId" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NavigationItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "isSale" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NavigationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LandingSection" (
    "id" TEXT NOT NULL,
    "type" "LandingSectionType" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StoreLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "schedule" TEXT,
    "googleMapsUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isWebWarehouse" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TopBanner" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "btnText" TEXT,
    "btnUrl" TEXT,
    "messages" JSONB,
    "bgColor" TEXT NOT NULL DEFAULT '#1C1C1C',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StoreLogo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "type" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreLogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HeaderConfig" (
    "id" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'logo-left-nav-center',
    "navAlignment" TEXT NOT NULL DEFAULT 'left',
    "showSearch" BOOLEAN NOT NULL DEFAULT true,
    "showCart" BOOLEAN NOT NULL DEFAULT true,
    "showUser" BOOLEAN NOT NULL DEFAULT true,
    "bgColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "textColor" TEXT NOT NULL DEFAULT '#1C1C1C',
    "hasBorderBottom" BOOLEAN NOT NULL DEFAULT true,
    "bgOpacity" INTEGER NOT NULL DEFAULT 100,
    "useBlur" BOOLEAN NOT NULL DEFAULT false,
    "margin" TEXT NOT NULL DEFAULT '0px',
    "padding" TEXT NOT NULL DEFAULT '0px',
    "borderRadius" TEXT NOT NULL DEFAULT '0px',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeaderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Brand_erpId_key" ON "Brand"("erpId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryLevel_variantId_storeLocationId_key" ON "InventoryLevel"("variantId", "storeLocationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Product_erpId_key" ON "Product"("erpId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Variant_erpId_key" ON "Variant"("erpId");

-- AddForeignKey
-- Postgres no soporta ADD CONSTRAINT IF NOT EXISTS: se borra primero si existe.
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_brandId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" DROP CONSTRAINT IF EXISTS "ProductReview_productId_fkey";
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLevel" DROP CONSTRAINT IF EXISTS "InventoryLevel_variantId_fkey";
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLevel" DROP CONSTRAINT IF EXISTS "InventoryLevel_storeLocationId_fkey";
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_storeLocationId_fkey" FOREIGN KEY ("storeLocationId") REFERENCES "StoreLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
