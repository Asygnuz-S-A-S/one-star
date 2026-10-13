-- Beneficios y preguntas frecuentes por producto (ficha orientada a conversión + SEO).
ALTER TABLE "Product" ADD COLUMN "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Product" ADD COLUMN "faqs" JSONB;

-- Moderación de reseñas: las existentes quedan aprobadas.
ALTER TABLE "ProductReview" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "ProductReview_productId_isApproved_idx" ON "ProductReview"("productId", "isApproved");
