-- Catálogo, chat, tarjeta de regalo, club y pie de página editables desde Configuración.
-- La vigencia solo aplica a tarjetas nuevas; las ya emitidas quedan sin fecha.

ALTER TABLE "StoreSettings"
  ADD COLUMN "hideImagelessProducts" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "newArrivalDays" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "chatWelcome" TEXT,
  ADD COLUMN "giftCardMinAmount" INTEGER NOT NULL DEFAULT 20000,
  ADD COLUMN "giftCardMaxAmount" INTEGER NOT NULL DEFAULT 2000000,
  ADD COLUMN "giftCardValidityMonths" INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN "clubHeadline" TEXT,
  ADD COLUMN "clubIntro" TEXT,
  ADD COLUMN "clubBenefits" TEXT,
  ADD COLUMN "clubWelcomeSubject" TEXT,
  ADD COLUMN "clubWelcomeBody" TEXT,
  ADD COLUMN "footerLinks" TEXT;

ALTER TABLE "GiftCard" ADD COLUMN "expiresAt" TIMESTAMP(3);
