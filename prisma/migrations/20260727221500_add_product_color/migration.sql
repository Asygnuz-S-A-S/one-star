-- CreateTable
CREATE TABLE "ProductColor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductColor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductColor_name_key" ON "ProductColor"("name");

-- Semilla: paleta base de One Star (equivale a PRODUCT_COLORS en src/lib/colors.ts).
-- Idempotente: si el color ya existe no se duplica.
INSERT INTO "ProductColor" ("id", "name", "hex", "position", "updatedAt") VALUES
  ('clr_seed_negro',      'Negro',       '#1C1C1C',  0, CURRENT_TIMESTAMP),
  ('clr_seed_blanco',     'Blanco',      '#FFFFFF',  1, CURRENT_TIMESTAMP),
  ('clr_seed_gris',       'Gris',        '#9E9E9E',  2, CURRENT_TIMESTAMP),
  ('clr_seed_rojo',       'Rojo',        '#E31C23',  3, CURRENT_TIMESTAMP),
  ('clr_seed_azul',       'Azul',        '#1565C0',  4, CURRENT_TIMESTAMP),
  ('clr_seed_azulmarino', 'Azul Marino', '#0D2B54',  5, CURRENT_TIMESTAMP),
  ('clr_seed_celeste',    'Celeste',     '#4FC3F7',  6, CURRENT_TIMESTAMP),
  ('clr_seed_verde',      'Verde',       '#2E7D32',  7, CURRENT_TIMESTAMP),
  ('clr_seed_lima',       'Lima',        '#AEEA00',  8, CURRENT_TIMESTAMP),
  ('clr_seed_amarillo',   'Amarillo',    '#FDD835',  9, CURRENT_TIMESTAMP),
  ('clr_seed_naranja',    'Naranja',     '#E65100', 10, CURRENT_TIMESTAMP),
  ('clr_seed_rosa',       'Rosa',        '#EC407A', 11, CURRENT_TIMESTAMP),
  ('clr_seed_morado',     'Morado',      '#6A1B9A', 12, CURRENT_TIMESTAMP),
  ('clr_seed_cafe',       'Café',        '#6D4C41', 13, CURRENT_TIMESTAMP),
  ('clr_seed_beige',      'Beige',       '#D7CCC8', 14, CURRENT_TIMESTAMP),
  ('clr_seed_crema',      'Crema',       '#F5F0E1', 15, CURRENT_TIMESTAMP),
  ('clr_seed_dorado',     'Dorado',      '#C9A227', 16, CURRENT_TIMESTAMP),
  ('clr_seed_plateado',   'Plateado',    '#C0C0C0', 17, CURRENT_TIMESTAMP),
  ('clr_seed_multicolor', 'Multicolor',  '#9E9E9E', 18, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
