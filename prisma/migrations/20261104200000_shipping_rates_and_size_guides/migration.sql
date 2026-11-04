-- Datos pedidos por One Star para la salida (2026-11-04).
-- Envío: gratis desde $299.900 y estándar a $14.900.
ALTER TABLE "StoreSettings" ALTER COLUMN "freeShippingThreshold" SET DEFAULT 299900;
ALTER TABLE "StoreSettings" ALTER COLUMN "standardShippingCost" SET DEFAULT 14900;
UPDATE "StoreSettings" SET "freeShippingThreshold" = 299900, "standardShippingCost" = 14900;

-- Tablas de tallas por marca; las imágenes viven en public/size-guides.
UPDATE "Brand" SET "sizeGuideMenUrl" = '/size-guides/nike-hombre.png', "sizeGuideWomenUrl" = '/size-guides/nike-mujer.png', "sizeGuideKidsUrl" = "sizeGuideKidsUrl" WHERE "slug" = 'nike';
UPDATE "Brand" SET "sizeGuideMenUrl" = '/size-guides/vans-hombre.png', "sizeGuideWomenUrl" = '/size-guides/vans-mujer.png', "sizeGuideKidsUrl" = '/size-guides/vans-ninos.png' WHERE "slug" = 'vans';
UPDATE "Brand" SET "sizeGuideMenUrl" = '/size-guides/converse-adultos.png', "sizeGuideWomenUrl" = '/size-guides/converse-adultos.png', "sizeGuideKidsUrl" = '/size-guides/converse-ninos.png' WHERE "slug" = 'converse';
UPDATE "Brand" SET "sizeGuideMenUrl" = '/size-guides/skechers-hombre.png', "sizeGuideWomenUrl" = '/size-guides/skechers-mujer.png', "sizeGuideKidsUrl" = '/size-guides/skechers-ninos.png' WHERE "slug" = 'skechers';
UPDATE "Brand" SET "sizeGuideMenUrl" = '/size-guides/new-balance-hombre.png', "sizeGuideWomenUrl" = '/size-guides/new-balance-mujer.png', "sizeGuideKidsUrl" = "sizeGuideKidsUrl" WHERE "slug" = 'new-balance';
UPDATE "Brand" SET "sizeGuideMenUrl" = '/size-guides/on-hombre.png', "sizeGuideWomenUrl" = '/size-guides/on-mujer.png', "sizeGuideKidsUrl" = "sizeGuideKidsUrl" WHERE "slug" = 'on';
UPDATE "Brand" SET "sizeGuideMenUrl" = '/size-guides/hoka-hombre.png', "sizeGuideWomenUrl" = '/size-guides/hoka-mujer.png', "sizeGuideKidsUrl" = "sizeGuideKidsUrl" WHERE "slug" = 'hoka';
