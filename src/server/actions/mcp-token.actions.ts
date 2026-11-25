"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireSuperAdmin } from "@/server/auth/require-admin"
import { getMcpPrincipal } from "@/server/auth/mcp-context"
import { createMcpToken, revokeMcpToken } from "@/server/services/mcp-token.service"
import { EntityIdSchema } from "@/server/validators/common.validator"

const CreateMcpTokenSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre al token (ej. Claude del Mac).").max(60),
})

export type CreateMcpTokenState = { token?: string; error?: string } | null

/** Tokens del conector MCP: solo Super Admin desde el navegador, nunca desde el propio conector. */
async function requireBrowserSuperAdmin() {
  if (getMcpPrincipal()) throw new Error("Un token no puede administrar tokens.")
  return requireSuperAdmin()
}

export async function createMcpTokenAction(_prev: CreateMcpTokenState, formData: FormData): Promise<CreateMcpTokenState> {
  try {
    const session = await requireBrowserSuperAdmin()
    const input = CreateMcpTokenSchema.parse({ name: formData.get("name") })
    const { token } = await createMcpToken({
      adminUserId: session.user.id,
      adminRole: session.user.adminRole,
      name: input.name,
      role: "SUPER_ADMIN",
    })
    revalidatePath("/admin/cuenta")
    return { token }
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues[0]?.message ?? "Datos inválidos." }
    return { error: error instanceof Error ? error.message : "No se pudo crear el token." }
  }
}

export async function revokeMcpTokenAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireBrowserSuperAdmin()
    await revokeMcpToken(EntityIdSchema.parse(id), { id: session.user.id, role: session.user.adminRole })
    revalidatePath("/admin/cuenta")
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo revocar." }
  }
}
