-- CreateEnum
CREATE TYPE "WebEventType" AS ENUM ('PAGE_VIEW', 'CATEGORY_VIEW', 'PRODUCT_VIEW', 'SEARCH', 'FILTER_APPLY', 'ADD_TO_CART', 'CHECKOUT_START', 'PURCHASE');

-- CreateTable
CREATE TABLE "WebVisitor" (
    "id" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landingPath" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "device" TEXT,
    "userId" TEXT,
    "leadId" TEXT,

    CONSTRAINT "WebVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebEvent" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "WebEventType" NOT NULL,
    "path" TEXT NOT NULL,
    "categorySlug" TEXT,
    "productSlug" TEXT,
    "brandSlug" TEXT,
    "searchTerm" TEXT,
    "filters" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebVisitor_anonId_key" ON "WebVisitor"("anonId");

-- CreateIndex
CREATE INDEX "WebVisitor_lastSeenAt_idx" ON "WebVisitor"("lastSeenAt");

-- CreateIndex
CREATE INDEX "WebVisitor_userId_idx" ON "WebVisitor"("userId");

-- CreateIndex
CREATE INDEX "WebVisitor_leadId_idx" ON "WebVisitor"("leadId");

-- CreateIndex
CREATE INDEX "WebEvent_visitorId_occurredAt_idx" ON "WebEvent"("visitorId", "occurredAt");

-- CreateIndex
CREATE INDEX "WebEvent_type_occurredAt_idx" ON "WebEvent"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "WebEvent_categorySlug_occurredAt_idx" ON "WebEvent"("categorySlug", "occurredAt");

-- CreateIndex
CREATE INDEX "WebEvent_productSlug_occurredAt_idx" ON "WebEvent"("productSlug", "occurredAt");

-- CreateIndex
CREATE INDEX "WebEvent_sessionId_idx" ON "WebEvent"("sessionId");

-- AddForeignKey
ALTER TABLE "WebEvent" ADD CONSTRAINT "WebEvent_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "WebVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

