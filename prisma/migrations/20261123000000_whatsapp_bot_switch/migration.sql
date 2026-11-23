-- Control manual (suiche) del bot de WhatsApp: global en StoreSettings y por conversación en Lead.
ALTER TABLE "Lead" ADD COLUMN "botPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN "botPausedAt" TIMESTAMP(3);
CREATE INDEX "Lead_botPaused_idx" ON "Lead"("botPaused");

ALTER TABLE "StoreSettings" ADD COLUMN "whatsappBotEnabled" BOOLEAN NOT NULL DEFAULT true;
