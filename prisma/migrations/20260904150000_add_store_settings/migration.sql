-- CreateTable
CREATE TABLE IF NOT EXISTS "StoreSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "storeName" TEXT NOT NULL DEFAULT 'One Star',
    "contactEmail" TEXT,
    "whatsapp" TEXT,
    "metaPixelId" TEXT,
    "metaAccessToken" TEXT,
    "metaTestEventCode" TEXT,
    "metaPixelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);
