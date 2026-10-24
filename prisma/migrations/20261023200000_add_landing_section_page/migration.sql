-- Expand-only: las secciones existentes quedan en la landing "home".
ALTER TABLE "LandingSection" ADD COLUMN "page" TEXT NOT NULL DEFAULT 'home';

CREATE INDEX "LandingSection_page_isActive_position_idx" ON "LandingSection"("page", "isActive", "position");
