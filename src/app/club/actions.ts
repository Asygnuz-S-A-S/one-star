"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { getClubStatus, joinClub, leaveClub, setNewsletterConsent, type ClubStatus } from "@/server/services/club.service"

type ClubActionResult = { success: true; status: ClubStatus } | { success: false; error: string }

/** Solo clientes con sesión: los administradores no son miembros del club. */
async function getCustomerId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user as { id?: string; userType?: string } | undefined
  return user?.id && user.userType === "customer" ? user.id : null
}

function done(status: ClubStatus): ClubActionResult {
  revalidatePath("/club")
  revalidatePath("/cuenta")
  return { success: true, status }
}

export async function joinClubAction(input: unknown): Promise<ClubActionResult> {
  const userId = await getCustomerId()
  if (!userId) return { success: false, error: "Inicia sesión para unirte al club." }
  const parsed = z.object({ newsletter: z.boolean() }).safeParse(input)
  if (!parsed.success) return { success: false, error: "Datos inválidos." }
  return done(await joinClub(userId, parsed.data))
}

export async function leaveClubAction(): Promise<ClubActionResult> {
  const userId = await getCustomerId()
  if (!userId) return { success: false, error: "Inicia sesión para continuar." }
  return done(await leaveClub(userId))
}

export async function setNewsletterAction(input: unknown): Promise<ClubActionResult> {
  const userId = await getCustomerId()
  if (!userId) return { success: false, error: "Inicia sesión para continuar." }
  const parsed = z.object({ accepted: z.boolean() }).safeParse(input)
  if (!parsed.success) return { success: false, error: "Datos inválidos." }
  return done(await setNewsletterConsent(userId, parsed.data.accepted))
}

/** Estado de la membresía para pantallas cliente (Mi cuenta). */
export async function getMyClubStatusAction(): Promise<ClubStatus | null> {
  const userId = await getCustomerId()
  return userId ? getClubStatus(userId) : null
}
