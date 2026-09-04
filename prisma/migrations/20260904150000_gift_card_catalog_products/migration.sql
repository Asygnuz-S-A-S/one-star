-- Tarjetas de regalo comprables.
--
-- Cada monto es un producto real del catálogo con su propia variante porque el
-- precio vive en `Product.basePrice` y no en la variante: sin producto real el
-- checkout no puede tasar el ítem. Estas cinco filas son parte de la
-- funcionalidad, no datos de demostración, y por eso viajan en una migración:
-- el despliegue solo ejecuta `prisma migrate deploy` (ver docker-entrypoint.sh)
-- y nunca corre el seed, que además inserta el catálogo de prueba.
--
-- Todo el archivo es idempotente: se puede aplicar sobre una base que ya tenga
-- las tarjetas (creadas por `prisma/seed-gift-card.ts` en desarrollo) sin
-- duplicarlas ni pisar lo que el administrador haya editado desde el panel.

-- 1. Categoría que las agrupa.
INSERT INTO "Category" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('gift-card-category', 'Tarjetas de regalo', 'tarjetas-regalo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- 2. Un producto por monto.
INSERT INTO "Product" (
    "id", "slug", "name", "basePrice", "description", "categoryId",
    "availableOnline", "availableInStores", "isPublished", "createdAt", "updatedAt"
)
SELECT
    tarjeta.product_id,
    tarjeta.slug,
    tarjeta.name,
    tarjeta.amount,
    'Tarjeta de regalo digital One Star. Se entrega por correo electrónico después de la compra.',
    categoria."id",
    true,   -- availableOnline: es el único canal donde se vende
    false,  -- availableInStores
    true,   -- isPublished
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (VALUES
    ('gift-card-product-50000',  'tarjeta-regalo-50000',  'Tarjeta de Regalo $50.000',   50000),
    ('gift-card-product-100000', 'tarjeta-regalo-100000', 'Tarjeta de Regalo $100.000', 100000),
    ('gift-card-product-200000', 'tarjeta-regalo-200000', 'Tarjeta de Regalo $200.000', 200000),
    ('gift-card-product-300000', 'tarjeta-regalo-300000', 'Tarjeta de Regalo $300.000', 300000),
    ('gift-card-product-500000', 'tarjeta-regalo-500000', 'Tarjeta de Regalo $500.000', 500000)
) AS tarjeta(product_id, slug, name, amount)
CROSS JOIN (SELECT "id" FROM "Category" WHERE "slug" = 'tarjetas-regalo') AS categoria
ON CONFLICT ("slug") DO NOTHING;

-- 3. Una variante por producto. El stock es nominal: una tarjeta digital no se
--    agota, pero `getGiftCardOptions` descarta las variantes en cero.
INSERT INTO "Variant" ("id", "sku", "size", "color", "stock", "productId")
SELECT
    tarjeta.variant_id,
    tarjeta.sku,
    'Digital',
    'Rojo One Star',
    9999,
    producto."id"
FROM (VALUES
    ('gift-card-variant-50000',  'GIFT-CARD-50000',  'tarjeta-regalo-50000'),
    ('gift-card-variant-100000', 'GIFT-CARD-100000', 'tarjeta-regalo-100000'),
    ('gift-card-variant-200000', 'GIFT-CARD-200000', 'tarjeta-regalo-200000'),
    ('gift-card-variant-300000', 'GIFT-CARD-300000', 'tarjeta-regalo-300000'),
    ('gift-card-variant-500000', 'GIFT-CARD-500000', 'tarjeta-regalo-500000')
) AS tarjeta(variant_id, sku, product_slug)
JOIN "Product" producto ON producto."slug" = tarjeta.product_slug
ON CONFLICT ("sku") DO NOTHING;

-- 4. Existencias en la bodega web (storeLocationId nulo), para que el panel de
--    inventario muestre lo mismo que valida el checkout. No se usa ON CONFLICT
--    porque @@unique([variantId, storeLocationId]) no impide duplicados cuando
--    la tienda es NULL: en PostgreSQL dos NULL no se consideran iguales.
INSERT INTO "InventoryLevel" ("id", "variantId", "storeLocationId", "stock")
SELECT
    'gift-card-inventory-' || variante."sku",
    variante."id",
    NULL,
    variante."stock"
FROM "Variant" variante
WHERE variante."sku" LIKE 'GIFT-CARD-%'
  AND NOT EXISTS (
      SELECT 1
      FROM "InventoryLevel" nivel
      WHERE nivel."variantId" = variante."id"
        AND nivel."storeLocationId" IS NULL
  );
