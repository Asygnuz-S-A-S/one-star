import "server-only"
import { prisma } from "../db/prisma"
import type { AdminRole, AdminUser } from "@prisma/client"

export async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  return prisma.adminUser.findUnique({ where: { email } })
}

export async function findAdminById(id: string): Promise<AdminUser | null> {
  return prisma.adminUser.findUnique({ where: { id } })
}

export async function findAdminRoleById(id: string): Promise<AdminUser["role"] | null> {
  const admin = await prisma.adminUser.findUnique({
    where: { id },
    select: { role: true },
  })
  return admin ? admin.role : null
}

export async function findAdminRoleByIdOrEmail(
  id?: string | null,
  email?: string | null
): Promise<AdminUser["role"] | null> {
  if (id) {
    const admin = await prisma.adminUser.findUnique({
      where: { id },
      select: { role: true },
    })
    if (admin) return admin.role
  }
  if (email) {
    const adminByEmail = await prisma.adminUser.findUnique({
      where: { email },
      select: { role: true },
    })
    if (adminByEmail) return adminByEmail.role
  }
  return null
}

export async function listAdminUsers() {
  return prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })
}

export async function createAdminUser(input: {
  email: string
  name: string
  passwordHash: string
  role: AdminRole
}) {
  return prisma.adminUser.create({ data: input, select: { id: true, email: true, role: true } })
}

export async function updateAdminUserRole(id: string, role: AdminRole) {
  return prisma.adminUser.update({ where: { id }, data: { role }, select: { id: true, email: true, role: true } })
}

export async function countSuperAdmins() {
  return prisma.adminUser.count({ where: { role: "SUPER_ADMIN" } })
}
