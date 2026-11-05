-- Conector MCP del admin: tokens por admin (solo hash) y bitácora de herramientas.
CREATE TABLE "McpToken" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "McpAuditLog" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "args" JSONB,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "McpToken_tokenHash_key" ON "McpToken"("tokenHash");
CREATE INDEX "McpToken_adminUserId_idx" ON "McpToken"("adminUserId");
CREATE INDEX "McpAuditLog_createdAt_idx" ON "McpAuditLog"("createdAt");
CREATE INDEX "McpAuditLog_tokenId_idx" ON "McpAuditLog"("tokenId");

ALTER TABLE "McpToken" ADD CONSTRAINT "McpToken_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "McpAuditLog" ADD CONSTRAINT "McpAuditLog_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "McpToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
