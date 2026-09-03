-- CreateEnum
CREATE TYPE "ErpSyncTrigger" AS ENUM ('MANUAL', 'AUTO');

-- CreateTable
CREATE TABLE "ErpSyncLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "trigger" "ErpSyncTrigger" NOT NULL DEFAULT 'AUTO',
    "success" BOOLEAN NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErpSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErpSyncLog_createdAt_idx" ON "ErpSyncLog"("createdAt");
