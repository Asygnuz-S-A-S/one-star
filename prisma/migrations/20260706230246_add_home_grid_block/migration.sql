/*
  Warnings:

  - You are about to drop the column `endDate` on the `Banner` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "endDate";

-- CreateTable
CREATE TABLE "HomeGridBlock" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL DEFAULT 'bg-[#3A3A3A]',
    "emoji" TEXT,
    "darkText" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeGridBlock_pkey" PRIMARY KEY ("id")
);
