-- Datos (no esquema): Hero de la home con las campañas HOKA ("Domina tu terreno" y
-- "Tecton X 3" con el zapato flotando). Corre una sola vez al desplegar (prisma migrate deploy).
-- Si ya hay un Hero en la home, reemplaza la configuración del primero (activo y de menor
-- posición), lo deja activo y descarta borradores; si no hay, lo crea al inicio.
-- Para editarlo después: admin → Landing builder → home → Hero (guardar y Publicar).
WITH target AS (
  SELECT "id" FROM "LandingSection"
  WHERE "page" = 'home' AND "type" = 'HERO'
  ORDER BY "isActive" DESC, "position" ASC, "createdAt" ASC
  LIMIT 1
), updated AS (
  UPDATE "LandingSection" AS s
  SET "config" = $hero${"version": 1, "kind": "campaignHero", "slides": [{"id": "domina-tu-terreno", "eyebrow": "Nuevo · HOKA", "headline": "Domina tu terreno", "copy": "Amortiguación que eleva cada paso, del sendero a la ciudad.", "accent": "carbon", "primaryCta": {"label": "Comprar HOKA", "href": "/marcas/hoka"}, "secondaryCta": {"label": "Ver todo", "href": "/productos"}, "desktopMedia": {"src": "https://res.cloudinary.com/dx3xszzcv/image/upload/one-star/productos/n2xgat03t310tuklhpif.jpg", "alt": "Tenis HOKA del sendero a la ciudad"}, "tabletMedia": {"src": "https://res.cloudinary.com/dx3xszzcv/image/upload/one-star/productos/fyvncotiyxjpwjn38ys9.jpg", "alt": "Tenis HOKA del sendero a la ciudad"}, "mobileMedia": {"src": "https://res.cloudinary.com/dx3xszzcv/image/upload/one-star/productos/zhmynbcarhfsdzk0wlqk.jpg", "alt": "Tenis HOKA del sendero a la ciudad"}}, {"id": "tecton-x-3", "eyebrow": "HOKA · Trail", "headline": "Tecton X 3", "copy": "Placas de carbono y amortiguación para dominar cualquier terreno.", "accent": "light", "primaryCta": {"label": "Comprar HOKA", "href": "/marcas/hoka"}, "foregroundMedia": {"src": "https://res.cloudinary.com/dx3xszzcv/image/upload/one-star/productos/a3h8pykjlknxfveqe7rz.png", "alt": "Tenis HOKA Tecton X 3"}}]}$hero$::jsonb, "draftConfig" = NULL, "isActive" = true, "updatedAt" = NOW()
  FROM target WHERE s."id" = target."id"
  RETURNING s."id"
)
INSERT INTO "LandingSection" ("id", "page", "type", "position", "isActive", "config", "createdAt", "updatedAt")
SELECT 'hero_home_hoka_20261030', 'home', 'HERO', 0, true, $hero${"version": 1, "kind": "campaignHero", "slides": [{"id": "domina-tu-terreno", "eyebrow": "Nuevo · HOKA", "headline": "Domina tu terreno", "copy": "Amortiguación que eleva cada paso, del sendero a la ciudad.", "accent": "carbon", "primaryCta": {"label": "Comprar HOKA", "href": "/marcas/hoka"}, "secondaryCta": {"label": "Ver todo", "href": "/productos"}, "desktopMedia": {"src": "https://res.cloudinary.com/dx3xszzcv/image/upload/one-star/productos/n2xgat03t310tuklhpif.jpg", "alt": "Tenis HOKA del sendero a la ciudad"}, "tabletMedia": {"src": "https://res.cloudinary.com/dx3xszzcv/image/upload/one-star/productos/fyvncotiyxjpwjn38ys9.jpg", "alt": "Tenis HOKA del sendero a la ciudad"}, "mobileMedia": {"src": "https://res.cloudinary.com/dx3xszzcv/image/upload/one-star/productos/zhmynbcarhfsdzk0wlqk.jpg", "alt": "Tenis HOKA del sendero a la ciudad"}}, {"id": "tecton-x-3", "eyebrow": "HOKA · Trail", "headline": "Tecton X 3", "copy": "Placas de carbono y amortiguación para dominar cualquier terreno.", "accent": "light", "primaryCta": {"label": "Comprar HOKA", "href": "/marcas/hoka"}, "foregroundMedia": {"src": "https://res.cloudinary.com/dx3xszzcv/image/upload/one-star/productos/a3h8pykjlknxfveqe7rz.png", "alt": "Tenis HOKA Tecton X 3"}}]}$hero$::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM target);
