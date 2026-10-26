-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "sizeGuideKidsUrl" TEXT,
ADD COLUMN     "sizeGuideMenUrl" TEXT,
ADD COLUMN     "sizeGuideWomenUrl" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLaunch" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StoreLocation" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
