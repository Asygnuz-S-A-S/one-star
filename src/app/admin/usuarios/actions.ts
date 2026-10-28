"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { requireSuperAdmin } from "@/server/auth/require-admin"
import {
  countSuperAdmins,
  createAdminUser,
  findAdminByEmail,
  findAdminById,
  setAdminUserActive,
  setAdminUserPassword,
  updateAdminUserRole,
} from "@/server/repositories/admin.repository"
import { invalidateAdminRoleCache } from "@/server/services/admin-role.service"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  email: z.email("El correo no es válido").max(120),
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres").max(80),
  role: z.enum(["SUPER_ADMIN", "INVENTORY_OPERATOR"]),
})

const roleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "INVENTORY_OPERATOR"]),
})

function message(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: Array<{ message: string }> }).issues
    if (issues[0]?.message) return issues[0].message
  }
  return error instanceof Error ? error.message : fallback
}

export async function createAdminUserAction(formData: FormData) {
  try {
    await requireSuperAdmin()
    const input = createSchema.parse({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? ""),
    })
    const existing = await findAdminByEmail(input.email)
    if (existing) return { success: false, error: "Ya existe un administrador con ese correo." }
    await createAdminUser({
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: bcrypt.hashSync(input.password, 10),
    })
    revalidatePath("/admin/usuarios")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: message(error, "No se pudo crear el usuario.") }
  }
}

export async function updateAdminRoleAction(formData: FormData) {
  try {
    const session = await requireSuperAdmin()
    const input = roleSchema.parse({
      id: String(formData.get("id") ?? ""),
      role: String(formData.get("role") ?? ""),
    })
    const current = await findAdminById(input.id)
    if (!current) return { success: false, error: "Ese usuario ya no existe." }
    if (current.role === "SUPER_ADMIN" && input.role !== "SUPER_ADMIN") {
      const supers = await countSuperAdmins()
      if (supers <= 1) return { success: false, error: "Tiene que quedar al menos un superadministrador." }
      if (session.user.id === current.id) return { success: false, error: "No puedes quitarte el rol de superadministrador." }
    }
    await updateAdminUserRole(input.id, input.role)
    revalidatePath("/admin/usuarios")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: message(error, "No se pudo cambiar el rol.") }
  }
}

export async function setAdminActiveAction(formData: FormData) {
  try {
    const session = await requireSuperAdmin()
    const id = String(formData.get("id") ?? "")
    const active = String(formData.get("active") ?? "") === "true"
    const current = await findAdminById(id)
    if (!current) return { success: false, error: "Ese usuario ya no existe." }
    if (!active && current.role === "SUPER_ADMIN") {
      const supers = await countSuperAdmins()
      if (supers <= 1) return { success: false, error: "Tiene que quedar al menos un superadministrador activo." }
      if (session.user.id === current.id) return { success: false, error: "No puedes desactivar tu propia cuenta." }
    }
    await setAdminUserActive(id, active)
    invalidateAdminRoleCache(current.id)
    invalidateAdminRoleCache(current.email)
    revalidatePath("/admin/usuarios")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: message(error, "No se pudo actualizar la cuenta.") }
  }
}

export async function resetAdminPasswordAction(formData: FormData) {
  try {
    await requireSuperAdmin()
    const id = String(formData.get("id") ?? "")
    const password = String(formData.get("password") ?? "")
    if (password.length < 10) return { success: false, error: "La contraseña debe tener al menos 10 caracteres." }
    const current = await findAdminById(id)
    if (!current) return { success: false, error: "Ese usuario ya no existe." }
    await setAdminUserPassword(id, bcrypt.hashSync(password, 10))
    revalidatePath("/admin/usuarios")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: message(error, "No se pudo cambiar la contraseña.") }
  }
}
