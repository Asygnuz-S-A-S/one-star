-- Expand: cada landing puede ocultar el menú y el footer de la tienda. Solo agrega.
ALTER TABLE "LandingPage" ADD COLUMN "showHeader" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LandingPage" ADD COLUMN "showFooter" BOOLEAN NOT NULL DEFAULT true;
