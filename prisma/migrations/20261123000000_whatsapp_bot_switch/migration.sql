-- Control del bot de WhatsApp: suiche global, suiche por chat, pausa automática temporal y alertas de traspaso al dashboard.
ALTER TABLE "Lead" ADD COLUMN "botPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN "botPausedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "botPausedUntil" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "needsHuman" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN "handoffReason" TEXT;
ALTER TABLE "Lead" ADD COLUMN "handoffAt" TIMESTAMP(3);
CREATE INDEX "Lead_botPaused_idx" ON "Lead"("botPaused");
CREATE INDEX "Lead_needsHuman_idx" ON "Lead"("needsHuman");

ALTER TABLE "StoreSettings" ADD COLUMN "whatsappBotEnabled" BOOLEAN NOT NULL DEFAULT true;
