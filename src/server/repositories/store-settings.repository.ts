import "server-only"
import { prisma } from "@/server/db/prisma"

/** La tabla tiene un único registro; este es su id fijo. */
export const STORE_SETTINGS_ID = "default"

export interface StoreSettingsPatch {
  storeName?: string
  contactEmail?: string | null
  whatsapp?: string | null
  metaPixelId?: string | null
  metaAccessToken?: string | null
  metaTestEventCode?: string | null
  metaPixelEnabled?: boolean
  catalogSource?: string
  freeShippingThreshold?: number
  standardShippingCost?: number
  expressShippingCost?: number
  legalName?: string | null
  taxId?: string | null
  legalAddress?: string | null
  contactPhone?: string | null
  hideImagelessProducts?: boolean
  newArrivalDays?: number
  chatEnabled?: boolean
  chatWelcome?: string | null
  giftCardMinAmount?: number
  giftCardMaxAmount?: number
  giftCardValidityMonths?: number
  clubHeadline?: string | null
  clubIntro?: string | null
  clubBenefits?: string | null
  clubWelcomeSubject?: string | null
  clubWelcomeBody?: string | null
  footerLinks?: string | null
  bottomNav?: string | null
  deliveryMinDays?: number
  deliveryMaxDays?: number
  expressDeliveryMinDays?: number
  expressDeliveryMaxDays?: number
  legalCity?: string | null
  commercialRegistry?: string | null
  dataProtectionEmail?: string | null
  termsDocumentUrl?: string | null
  privacyDocumentUrl?: string | null
  returnsDocumentUrl?: string | null
  giftCardAmounts?: string | null
}

/** Devuelve el registro único; lo crea con los defaults del schema si no existe. */
export async function findStoreSettings() {
  return prisma.storeSettings.upsert({
    where: { id: STORE_SETTINGS_ID },
    update: {},
    create: { id: STORE_SETTINGS_ID },
  })
}

/** Lectura sin escritura para páginas públicas: `null` si el registro aún no existe. */
export async function findStoreSettingsReadOnly() {
  return prisma.storeSettings.findUnique({ where: { id: STORE_SETTINGS_ID } })
}

export async function updateStoreSettingsRecord(patch: StoreSettingsPatch) {
  return prisma.storeSettings.upsert({
    where: { id: STORE_SETTINGS_ID },
    update: patch,
    create: { id: STORE_SETTINGS_ID, ...patch },
  })
}
