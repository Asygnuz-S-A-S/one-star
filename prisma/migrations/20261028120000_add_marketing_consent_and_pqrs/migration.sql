-- CreateEnum
CREATE TYPE "PqrsType" AS ENUM ('CONSULTA', 'RECLAMO', 'SUPRESION', 'RETIRO_PUBLICIDAD');

-- CreateEnum
CREATE TYPE "PqrsStatus" AS ENUM ('PENDIENTE', 'EN_TRAMITE', 'RESUELTO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "marketingConsentVersion" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "marketingConsentAt" TIMESTAMP(3),
ADD COLUMN "marketingConsentVersion" TEXT;

-- CreateTable
CREATE TABLE "PqrsRequest" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'CC',
    "documentNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "type" "PqrsType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PqrsStatus" NOT NULL DEFAULT 'PENDIENTE',
    "responseNotes" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PqrsRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PqrsRequest_ticketNumber_key" ON "PqrsRequest"("ticketNumber");

-- CreateIndex
CREATE INDEX "PqrsRequest_email_idx" ON "PqrsRequest"("email");

-- CreateIndex
CREATE INDEX "PqrsRequest_documentNumber_idx" ON "PqrsRequest"("documentNumber");

-- CreateIndex
CREATE INDEX "PqrsRequest_status_idx" ON "PqrsRequest"("status");
