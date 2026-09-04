import "server-only"

import {
  findStoreSettings,
  updateStoreSettingsRecord,
} from "@/server/repositories/store-settings.repository"
import type { MetaPixelInput, StoreInfoInput } from "@/server/validators/store-settings.validator"

/** Vista segura para el admin: nunca incluye el token, solo una pista. */
export interface StoreSettingsDTO {
  storeName: string
  contactEmail: string | null
  whatsapp: string | null
  metaPixelId: string | null
  metaPixelEnabled: boolean
  metaTestEventCode: string | null
  hasMetaAccessToken: boolean
  /** Últimos 4 caracteres del token para que el admin sepa cuál está cargado. */
  metaAccessTokenHint: string | null
}

/** Lo único del píxel que puede viajar al navegador. */
export interface MetaPixelPublicConfig {
  pixelId: string
}

/** Credenciales completas: solo para la API de Conversiones (servidor). */
export interface MetaConversionsCredentials {
  pixelId: string
  accessToken: string
  testEventCode: string | null
}

const TOKEN_HINT_LENGTH = 4

function toDTO(raw: {
  storeName: string
  contactEmail: string | null
  whatsapp: string | null
  metaPixelId: string | null
  metaAccessToken: string | null
  metaTestEventCode: string | null
  metaPixelEnabled: boolean
}): StoreSettingsDTO {
  return {
    storeName: raw.storeName,
    contactEmail: raw.contactEmail,
    whatsapp: raw.whatsapp,
    metaPixelId: raw.metaPixelId,
    metaPixelEnabled: raw.metaPixelEnabled,
    metaTestEventCode: raw.metaTestEventCode,
    hasMetaAccessToken: Boolean(raw.metaAccessToken),
    metaAccessTokenHint: raw.metaAccessToken
      ? raw.metaAccessToken.slice(-TOKEN_HINT_LENGTH)
      : null,
  }
}

export async function getStoreSettings(): Promise<StoreSettingsDTO> {
  return toDTO(await findStoreSettings())
}

export async function updateStoreInfo(input: StoreInfoInput): Promise<StoreSettingsDTO> {
  return toDTO(
    await updateStoreSettingsRecord({
      storeName: input.storeName,
      contactEmail: input.contactEmail,
      whatsapp: input.whatsapp,
    }),
  )
}

/**
 * Guarda la configuración del píxel. El token solo cambia si llega uno nuevo
 * o si se pide borrarlo explícitamente: un campo vacío conserva el actual.
 */
export async function updateMetaPixelSettings(input: MetaPixelInput): Promise<StoreSettingsDTO> {
  const tokenPatch = input.clearAccessToken
    ? { metaAccessToken: null }
    : input.accessToken !== null
      ? { metaAccessToken: input.accessToken }
      : {}

  return toDTO(
    await updateStoreSettingsRecord({
      metaPixelEnabled: input.enabled,
      metaPixelId: input.pixelId,
      metaTestEventCode: input.testEventCode,
      ...tokenPatch,
    }),
  )
}

/** Config del píxel para el layout público. `null` = no inyectar nada. */
export async function getMetaPixelPublicConfig(): Promise<MetaPixelPublicConfig | null> {
  const settings = await findStoreSettings()
  if (!settings.metaPixelEnabled || !settings.metaPixelId) return null
  return { pixelId: settings.metaPixelId }
}

/** Credenciales para la API de Conversiones. `null` = no enviar eventos. */
export async function getMetaConversionsCredentials(): Promise<MetaConversionsCredentials | null> {
  const settings = await findStoreSettings()
  if (!settings.metaPixelEnabled || !settings.metaPixelId || !settings.metaAccessToken) {
    return null
  }
  return {
    pixelId: settings.metaPixelId,
    accessToken: settings.metaAccessToken,
    testEventCode: settings.metaTestEventCode,
  }
}
