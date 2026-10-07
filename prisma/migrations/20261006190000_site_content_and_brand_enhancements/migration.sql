-- CreateTable: SiteContent (singleton id = 'default')
CREATE TABLE "SiteContent" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "faqs" JSONB,
    "promises" JSONB,
    "returnWindowDays" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Brand enhancements
ALTER TABLE "Brand" ADD COLUMN "bannerUrl" TEXT;
ALTER TABLE "Brand" ADD COLUMN "description" TEXT;
ALTER TABLE "Brand" ADD COLUMN "story" TEXT;
ALTER TABLE "Brand" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "Brand" ADD COLUMN "metaDescription" TEXT;
ALTER TABLE "Brand" ADD COLUMN "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Brand" ADD COLUMN "faqs" JSONB;

-- AlterTable: ProductReview featured flag
ALTER TABLE "ProductReview" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ProductReview_isApproved_isFeatured_idx" ON "ProductReview"("isApproved", "isFeatured");
