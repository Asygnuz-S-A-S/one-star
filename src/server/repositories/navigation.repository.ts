import "server-only";
import { prisma } from "../db/prisma";

export async function getActiveNavigationItems() {
  return prisma.navigationItem.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
  });
}

export async function getAllNavigationItems() {
  return prisma.navigationItem.findMany({
    orderBy: { position: "asc" },
  });
}
