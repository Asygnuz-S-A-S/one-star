-- Home configurable: interruptor de SALE vacío y sección «Tus últimos vistos». Solo agrega.
ALTER TABLE "StoreSettings" ADD COLUMN "hideEmptySale" BOOLEAN NOT NULL DEFAULT true;
ALTER TYPE "LandingSectionType" ADD VALUE 'RECENTLY_VIEWED';
