CREATE TABLE "ErpSyncConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErpSyncConfig_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ErpSyncConfig_singleton_check" CHECK ("id" = 'default'),
    CONSTRAINT "ErpSyncConfig_interval_check" CHECK ("intervalMinutes" IN (15, 30, 60, 120, 360, 720, 1440))
);
