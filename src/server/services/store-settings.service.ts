import "server-only"

import {
  findStoreSettings,
  findStoreSettingsReadOnly,
  updateStoreSettingsRecord,
} from "@/server/repositories/store-settings.repository"
import { normalizeCatalogSource, type CatalogSource } from "@/lib/catalog-source"
import { LEGAL_COMPANY, type LegalCompanyInfo } from "@/lib/legal"
import { DEFAULT_SHIPPING_RATES, type ShippingRates } from "@/lib/shipping"
import type {
  MetaPixelInput,
  StoreInfoInput,
} from "@/server/validators/store-settings.validator"

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
  catalogSource: CatalogSource
  freeShippingThreshold: number
  standardShippingCost: number
  expressShippingCost: number
  legalName: string | null
  taxId: string | null
  legalAddress: string | null
  contactPhone: string | null
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
  catalogSource?: string | null
  freeShippingThreshold?: number | null
  standardShippingCost?: number | null
  expressShippingCost?: number | null
  legalName?: string | null
  taxId?: string | null
  legalAddress?: string | null
  contactPhone?: string | null
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
    catalogSource: normalizeCatalogSource(raw.catalogSource),
    freeShippingThreshold: raw.freeShippingThreshold ?? DEFAULT_SHIPPING_RATES.freeThreshold,
    standardShippingCost: raw.standardShippingCost ?? DEFAULT_SHIPPING_RATES.standardCost,
    expressShippingCost: raw.expressShippingCost ?? DEFAULT_SHIPPING_RATES.expressCost,
    legalName: raw.legalName ?? null,
    taxId: raw.taxId ?? null,
    legalAddress: raw.legalAddress ?? null,
    contactPhone: raw.contactPhone ?? null,
  }
}

export function toShippingRates(settings: {
  freeShippingThreshold: number
  standardShippingCost: number
  expressShippingCost: number
}): ShippingRates {
  return {
    freeThreshold: settings.freeShippingThreshold,
    standardCost: settings.standardShippingCost,
    expressCost: settings.expressShippingCost,
  }
}

/** Datos públicos de la tienda para SEO y botones de contacto. No escribe en la base de datos. */
export async function getPublicStoreInfo(): Promise<{ storeName: string; whatsapp: string | null }> {
  const settings = await findStoreSettingsReadOnly()
  return { storeName: settings?.storeName ?? "One Star", whatsapp: settings?.whatsapp ?? null }
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
      freeShippingThreshold: input.freeShippingThreshold,
      standardShippingCost: input.standardShippingCost,
      expressShippingCost: input.expressShippingCost,
      legalName: input.legalName,
      taxId: input.taxId,
      legalAddress: input.legalAddress,
      contactPhone: input.contactPhone,
    }),
  )
}

/** Tarifas que cobran carrito, checkout y pedido. Sin registro, usa el respaldo. */
export async function getShippingRates(): Promise<ShippingRates> {
  const settings = await findStoreSettingsReadOnly()
  if (!settings) return DEFAULT_SHIPPING_RATES
  return toShippingRates(settings)
}

/** Identificación del responsable para términos y privacidad. */
export async function getLegalCompany(): Promise<LegalCompanyInfo> {
  const settings = await findStoreSettingsReadOnly()
  if (!settings) return LEGAL_COMPANY
  return {
    tradeName: settings.storeName || LEGAL_COMPANY.tradeName,
    legalName: settings.legalName,
    taxId: settings.taxId,
    address: settings.legalAddress,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
  }
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

export async function updateCatalogSource(source: CatalogSource): Promise<StoreSettingsDTO> {
  return toDTO(
    await updateStoreSettingsRecord({
      catalogSource: source,
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
