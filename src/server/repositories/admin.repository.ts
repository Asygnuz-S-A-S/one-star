import "server-only"
import { prisma } from "../db/prisma"
import type { AdminUser } from "@prisma/client"

export async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  return prisma.adminUser.findUnique({ where: { email } })
}

export async function findAdminById(id: string): Promise<AdminUser | null> {
  return prisma.adminUser.findUnique({ where: { id } })
}
