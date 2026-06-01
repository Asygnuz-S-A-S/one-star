import { PrismaClient } from "@prisma/client";

/*
 * Singleton de Prisma para entornos con HMR (Next.js dev).
 * Sin este patrón, cada hot-reload abre una nueva conexión hasta agotar el pool.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
