-- AlterTable
ALTER TABLE "StoreLocation" ADD COLUMN "erpId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StoreLocation_erpId_key" ON "StoreLocation"("erpId");
