-- Entrada "Marcas" en el menú principal (HU-5, one-star-6).
--
-- El menú vive en la tabla NavigationItem, que el administrador edita desde
-- /admin/navegacion. La página /marcas es parte del código, así que su entrada
-- viaja en una migración para que aparezca en producción sin pasos manuales
-- (el despliegue solo corre `prisma migrate deploy`, nunca el seed).
--
-- Idempotente: no inserta nada si ya existe un ítem que apunte a /marcas, y se
-- coloca al final para no reordenar lo que el administrador haya configurado.
INSERT INTO "NavigationItem" ("id", "label", "href", "isSale", "position", "isActive", "createdAt", "updatedAt")
SELECT
    'nav-marcas',
    'Marcas',
    '/marcas',
    false,
    COALESCE((SELECT MAX("position") FROM "NavigationItem"), 0) + 1,
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "NavigationItem" WHERE "href" = '/marcas'
);
