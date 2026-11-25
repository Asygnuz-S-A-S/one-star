-- Etiquetas automáticas y manuales para segmentación y seguimiento de leads de WhatsApp.
ALTER TABLE "Lead" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "Lead_tags_idx" ON "Lead" USING GIN ("tags");
