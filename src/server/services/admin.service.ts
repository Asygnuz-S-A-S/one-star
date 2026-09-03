import "server-only"
import { findAdminByEmail, findAdminById } from "../repositories/admin.repository"
import type { AdminUser } from "@prisma/client"

export interface AdminUserDTO {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  updatedAt: string
}

export interface AdminUserAuthDTO extends AdminUserDTO {
  passwordHash: string
}

function mapToDTO(admin: AdminUser): AdminUserDTO {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    createdAt: admin.createdAt.toISOString(),
    updatedAt: admin.updatedAt.toISOString(),
  }
}

function mapToAuthDTO(admin: AdminUser): AdminUserAuthDTO {
  return {
    ...mapToDTO(admin),
    passwordHash: admin.passwordHash,
  }
}

export async function getAdminByEmailForAuth(email: string): Promise<AdminUserAuthDTO | null> {
  const admin = await findAdminByEmail(email)
  return admin ? mapToAuthDTO(admin) : null
}

export async function getAdminById(id: string): Promise<AdminUserDTO | null> {
  const admin = await findAdminById(id)
  return admin ? mapToDTO(admin) : null
}
