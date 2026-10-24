-- Better Auth stores the last request as Unix milliseconds, not a SQL timestamp.
-- Preserve any rows created before the schema was corrected.
ALTER TABLE "RateLimit"
ALTER COLUMN "lastRequest" TYPE BIGINT
USING (EXTRACT(EPOCH FROM "lastRequest") * 1000)::BIGINT;

-- Better Auth's Prisma adapter generates an opaque primary key and keeps the
-- rate-limit lookup key as a separate unique field.
ALTER TABLE "RateLimit" ADD COLUMN "id" TEXT;
UPDATE "RateLimit" SET "id" = "key" WHERE "id" IS NULL;
ALTER TABLE "RateLimit" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "RateLimit" DROP CONSTRAINT "RateLimit_pkey";
ALTER TABLE "RateLimit" ADD CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");
