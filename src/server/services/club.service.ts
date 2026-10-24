import "server-only"

import { findUserById, updateUser } from "@/server/repositories/user.repository"
import { findActiveClubCoupons } from "@/server/repositories/coupon.repository"
import { sendClubWelcomeEmail } from "@/server/services/email.service"

export interface ClubStatus {
  isMember: boolean
  joinedAt: string | null
  newsletter: boolean
}

export interface ClubPromotionDTO {
  /** Solo se entrega a miembros; para el resto queda en null. */
  code: string | null
  discountType: "PERCENTAGE" | "FIXED_AMOUNT"
  discountValue: number
  minOrderAmount: number | null
  validUntil: string
}

function toStatus(user: { clubMember: boolean; clubJoinedAt: Date | null; marketingConsentAt: Date | null }): ClubStatus {
  return {
    isMember: user.clubMember,
    joinedAt: user.clubJoinedAt?.toISOString() ?? null,
    newsletter: user.marketingConsentAt !== null,
  }
}

export async function getClubStatus(userId: string): Promise<ClubStatus | null> {
  const user = await findUserById(userId)
  return user ? toStatus(user) : null
}

export async function isClubMember(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  const user = await findUserById(userId)
  return user?.clubMember ?? false
}

/**
 * Une al usuario al club. El newsletter es un consentimiento aparte: solo se registra si lo
 * acepta explícitamente. La bienvenida se envía una sola vez (fire-and-forget).
 */
export async function joinClub(userId: string, options: { newsletter: boolean }): Promise<ClubStatus> {
  const user = await findUserById(userId)
  if (!user) throw new Error("Usuario no encontrado")
  const now = new Date()
  const updated = await updateUser(userId, {
    clubMember: true,
    clubJoinedAt: user.clubJoinedAt ?? now,
    ...(options.newsletter && !user.marketingConsentAt ? { marketingConsentAt: now } : {}),
  })
  if (!user.clubMember) {
    void sendClubWelcomeEmail({ email: user.email, name: user.name ?? undefined, newsletter: updated.marketingConsentAt !== null })
      .catch((error: unknown) => console.error("[club] correo de bienvenida falló:", error))
  }
  return toStatus(updated)
}

export async function leaveClub(userId: string): Promise<ClubStatus> {
  return toStatus(await updateUser(userId, { clubMember: false, clubJoinedAt: null }))
}

export async function setNewsletterConsent(userId: string, accepted: boolean): Promise<ClubStatus> {
  return toStatus(await updateUser(userId, { marketingConsentAt: accepted ? new Date() : null }))
}

/** Promociones vigentes del club; el código solo se revela a miembros. */
export async function getClubPromotions(revealCodes: boolean): Promise<ClubPromotionDTO[]> {
  const coupons = await findActiveClubCoupons(new Date())
  return coupons.map((coupon) => ({
    code: revealCodes ? coupon.code : null,
    discountType: coupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: Number(coupon.discountValue),
    minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
    validUntil: coupon.validUntil.toISOString(),
  }))
}
