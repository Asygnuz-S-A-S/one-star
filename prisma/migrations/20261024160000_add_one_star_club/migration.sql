-- Expand-only: nadie es miembro ni tiene consentimiento hasta que lo acepte.
ALTER TABLE "User" ADD COLUMN "clubMember" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "clubJoinedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "marketingConsentAt" TIMESTAMP(3);

ALTER TABLE "Coupon" ADD COLUMN "clubOnly" BOOLEAN NOT NULL DEFAULT false;
