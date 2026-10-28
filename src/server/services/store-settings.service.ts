import "server-only"

import {
  findStoreSettings,
  findStoreSettingsReadOnly,
  updateStoreSettingsRecord,
} from "@/server/repositories/store-settings.repository"
import {
  getCatalogSettingsRecord,
  upsertCatalogSettingsRecord,
} from "@/server/repositories/site-content.repository"
import { normalizeCatalogSource, type CatalogSource } from "@/lib/catalog-source"
import { DEFAULT_GIFT_CARD_LIMITS, type GiftCardLimits } from "@/lib/gift-card"
import { LEGAL_COMPANY, type LegalCompanyInfo } from "@/lib/legal"
import { DEFAULT_SHIPPING_RATES, type ShippingRates } from "@/lib/shipping"
import {
  DEFAULT_CHAT_WELCOME,
  DEFAULT_CLUB_HEADLINE,
  DEFAULT_CLUB_INTRO,
  DEFAULT_CLUB_WELCOME_BODY,
  DEFAULT_CLUB_WELCOME_SUBJECT,
  parseBottomNav,
  parseClubBenefits,
  parseFooterLinks,
  type BottomNavItem,
  type ClubBenefit,
  type FooterLink,
} from "@/lib/storefront-copy"
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
  hideImagelessProducts: boolean
  newArrivalDays: number
  chatEnabled: boolean
  chatWelcome: string
  giftCardMinAmount: number
  giftCardMaxAmount: number
  giftCardValidityMonths: number
  clubHeadline: string
  clubIntro: string
  clubBenefits: string
  clubWelcomeSubject: string
  clubWelcomeBody: string
  footerLinks: string
  bottomNav: string
  deliveryMinDays: number
  deliveryMaxDays: number
  expressDeliveryMinDays: number
  expressDeliveryMaxDays: number
  legalCity: string | null
  commercialRegistry: string | null
  dataProtectionEmail: string | null
  termsDocumentUrl: string | null
  privacyDocumentUrl: string | null
  returnsDocumentUrl: string | null
  giftCardAmounts: string
  groupColorsInCatalog: boolean
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
  hideImagelessProducts?: boolean | null
  newArrivalDays?: number | null
  chatEnabled?: boolean | null
  chatWelcome?: string | null
  giftCardMinAmount?: number | null
  giftCardMaxAmount?: number | null
  giftCardValidityMonths?: number | null
  clubHeadline?: string | null
  clubIntro?: string | null
  clubBenefits?: string | null
  clubWelcomeSubject?: string | null
  clubWelcomeBody?: string | null
  footerLinks?: string | null
  bottomNav?: string | null
  deliveryMinDays?: number | null
  deliveryMaxDays?: number | null
  expressDeliveryMinDays?: number | null
  expressDeliveryMaxDays?: number | null
  legalCity?: string | null
  commercialRegistry?: string | null
  dataProtectionEmail?: string | null
  termsDocumentUrl?: string | null
  privacyDocumentUrl?: string | null
  returnsDocumentUrl?: string | null
  giftCardAmounts?: string | null
}, catalogRules?: { groupColorsInCatalog?: boolean }): StoreSettingsDTO {
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
    hideImagelessProducts: raw.hideImagelessProducts ?? true,
    newArrivalDays: raw.newArrivalDays ?? 30,
    chatEnabled: raw.chatEnabled ?? true,
    chatWelcome: raw.chatWelcome?.trim() || DEFAULT_CHAT_WELCOME,
    giftCardMinAmount: raw.giftCardMinAmount ?? DEFAULT_GIFT_CARD_LIMITS.minAmount,
    giftCardMaxAmount: raw.giftCardMaxAmount ?? DEFAULT_GIFT_CARD_LIMITS.maxAmount,
    giftCardValidityMonths: raw.giftCardValidityMonths ?? DEFAULT_GIFT_CARD_LIMITS.validityMonths,
    clubHeadline: raw.clubHeadline?.trim() || DEFAULT_CLUB_HEADLINE,
    clubIntro: raw.clubIntro?.trim() || DEFAULT_CLUB_INTRO,
    clubBenefits: raw.clubBenefits ?? "",
    clubWelcomeSubject: raw.clubWelcomeSubject?.trim() || DEFAULT_CLUB_WELCOME_SUBJECT,
    clubWelcomeBody: raw.clubWelcomeBody?.trim() || DEFAULT_CLUB_WELCOME_BODY,
    footerLinks: raw.footerLinks ?? "",
    bottomNav: raw.bottomNav ?? "",
    deliveryMinDays: raw.deliveryMinDays ?? 3,
    deliveryMaxDays: raw.deliveryMaxDays ?? 5,
    expressDeliveryMinDays: raw.expressDeliveryMinDays ?? 1,
    expressDeliveryMaxDays: raw.expressDeliveryMaxDays ?? 2,
    legalCity: raw.legalCity ?? null,
    commercialRegistry: raw.commercialRegistry ?? null,
    dataProtectionEmail: raw.dataProtectionEmail ?? null,
    termsDocumentUrl: raw.termsDocumentUrl ?? null,
    privacyDocumentUrl: raw.privacyDocumentUrl ?? null,
    returnsDocumentUrl: raw.returnsDocumentUrl ?? null,
    giftCardAmounts: raw.giftCardAmounts ?? "",
    groupColorsInCatalog: catalogRules?.groupColorsInCatalog ?? true,
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
  const [raw, catalogSettings] = await Promise.all([
    findStoreSettings(),
    getCatalogSettingsRecord().catch(() => ({ groupColorsInCatalog: true })),
  ])
  return toDTO(raw, catalogSettings)
}

export async function updateStoreInfo(input: StoreInfoInput): Promise<StoreSettingsDTO> {
  if (input.groupColorsInCatalog !== undefined) {
    await upsertCatalogSettingsRecord({ groupColorsInCatalog: input.groupColorsInCatalog })
  }
  const updated = await updateStoreSettingsRecord({
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
    hideImagelessProducts: input.hideImagelessProducts,
    newArrivalDays: input.newArrivalDays,
    chatEnabled: input.chatEnabled,
    chatWelcome: input.chatWelcome,
    giftCardMinAmount: input.giftCardMinAmount,
    giftCardMaxAmount: input.giftCardMaxAmount,
    giftCardValidityMonths: input.giftCardValidityMonths,
    clubHeadline: input.clubHeadline,
    clubIntro: input.clubIntro,
    clubBenefits: input.clubBenefits,
    clubWelcomeSubject: input.clubWelcomeSubject,
    clubWelcomeBody: input.clubWelcomeBody,
    footerLinks: input.footerLinks,
    bottomNav: input.bottomNav,
    deliveryMinDays: input.deliveryMinDays,
    deliveryMaxDays: input.deliveryMaxDays,
    expressDeliveryMinDays: input.expressDeliveryMinDays,
    expressDeliveryMaxDays: input.expressDeliveryMaxDays,
    legalCity: input.legalCity,
    commercialRegistry: input.commercialRegistry,
    dataProtectionEmail: input.dataProtectionEmail,
    giftCardAmounts: input.giftCardAmounts,
  })
  return toDTO(updated, { groupColorsInCatalog: input.groupColorsInCatalog ?? true })
}

const DOCUMENT_FIELDS = {
  terms: "termsDocumentUrl",
  privacy: "privacyDocumentUrl",
  returns: "returnsDocumentUrl",
} as const

export async function setLegalDocument(kind: keyof typeof DOCUMENT_FIELDS, url: string | null) {
  return toDTO(await updateStoreSettingsRecord({ [DOCUMENT_FIELDS[kind]]: url }))
}

export interface PublicStorefrontConfig {
  shipping: ShippingRates
  chatEnabled: boolean
  chatWelcome: string
  giftCardValidityMonths: number
  footerLinks: FooterLink[]
  bottomNav: BottomNavItem[]
  deliveryMinDays: number
  deliveryMaxDays: number
  expressDeliveryMinDays: number
  expressDeliveryMaxDays: number
  storeName: string
  contactEmail: string | null
  whatsapp: string | null
}

export async function getPublicStorefrontConfig(): Promise<PublicStorefrontConfig> {
  const settings = await findStoreSettingsReadOnly()
  const dto = settings
    ? toDTO(settings)
    : toDTO({
        storeName: "One Star",
        contactEmail: null,
        whatsapp: null,
        metaPixelId: null,
        metaAccessToken: null,
        metaTestEventCode: null,
        metaPixelEnabled: false,
      })
  return {
    shipping: toShippingRates(dto),
    chatEnabled: dto.chatEnabled,
    chatWelcome: dto.chatWelcome,
    giftCardValidityMonths: dto.giftCardValidityMonths,
    footerLinks: parseFooterLinks(dto.footerLinks),
    bottomNav: parseBottomNav(dto.bottomNav),
    deliveryMinDays: dto.deliveryMinDays,
    deliveryMaxDays: dto.deliveryMaxDays,
    expressDeliveryMinDays: dto.expressDeliveryMinDays,
    expressDeliveryMaxDays: dto.expressDeliveryMaxDays,
    storeName: dto.storeName,
    contactEmail: dto.contactEmail,
    whatsapp: dto.whatsapp,
  }
}

export async function getCatalogRules(): Promise<{
  hideImagelessProducts: boolean
  newArrivalDays: number
  groupColorsInCatalog: boolean
}> {
  const [settings, catalogSettings] = await Promise.all([
    findStoreSettingsReadOnly(),
    getCatalogSettingsRecord().catch(() => ({ groupColorsInCatalog: true })),
  ])
  return {
    hideImagelessProducts: settings?.hideImagelessProducts ?? true,
    newArrivalDays: settings?.newArrivalDays ?? 30,
    groupColorsInCatalog: catalogSettings.groupColorsInCatalog,
  }
}

export async function getGiftCardLimits(): Promise<GiftCardLimits> {
  const settings = await findStoreSettingsReadOnly()
  return {
    minAmount: settings?.giftCardMinAmount ?? DEFAULT_GIFT_CARD_LIMITS.minAmount,
    maxAmount: settings?.giftCardMaxAmount ?? DEFAULT_GIFT_CARD_LIMITS.maxAmount,
    validityMonths: settings?.giftCardValidityMonths ?? DEFAULT_GIFT_CARD_LIMITS.validityMonths,
  }
}

export async function getClubCopy(): Promise<{
  headline: string
  intro: string
  benefits: ClubBenefit[]
  welcomeSubject: string
  welcomeBody: string
}> {
  const settings = await findStoreSettingsReadOnly()
  const dto = settings
    ? toDTO(settings)
    : toDTO({
        storeName: "One Star",
        contactEmail: null,
        whatsapp: null,
        metaPixelId: null,
        metaAccessToken: null,
        metaTestEventCode: null,
        metaPixelEnabled: false,
      })
  return {
    headline: dto.clubHeadline,
    intro: dto.clubIntro,
    benefits: parseClubBenefits(dto.clubBenefits),
    welcomeSubject: dto.clubWelcomeSubject,
    welcomeBody: dto.clubWelcomeBody,
  }
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
    city: settings.legalCity,
    commercialRegistry: settings.commercialRegistry,
    dataProtectionEmail: settings.dataProtectionEmail,
  }
}

export async function getLegalDocuments() {
  const settings = await findStoreSettingsReadOnly()
  return {
    terms: settings?.termsDocumentUrl ?? null,
    privacy: settings?.privacyDocumentUrl ?? null,
    returns: settings?.returnsDocumentUrl ?? null,
  }
}

export async function getDeliveryWindow(): Promise<{ min: number; max: number }> {
  const settings = await findStoreSettingsReadOnly()
  return {
    min: settings?.deliveryMinDays ?? 3,
    max: settings?.deliveryMaxDays ?? 5,
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
