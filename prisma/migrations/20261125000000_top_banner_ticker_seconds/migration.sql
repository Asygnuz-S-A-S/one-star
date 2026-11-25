-- Velocidad editable de la barra superior (segundos por mensaje).
ALTER TABLE "TopBanner" ADD COLUMN "tickerSeconds" INTEGER NOT NULL DEFAULT 6;
