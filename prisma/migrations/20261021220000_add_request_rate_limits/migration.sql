CREATE TABLE "RequestRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RequestRateLimit_resetAt_idx" ON "RequestRateLimit"("resetAt");


CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");
CREATE INDEX "RateLimit_lastRequest_idx" ON "RateLimit"("lastRequest");
