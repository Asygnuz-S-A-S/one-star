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
}

/** Devuelve el registro único; lo crea con los defaults del schema si no existe. */
export async function findStoreSettings() {
  return prisma.storeSettings.upsert({
    where: { id: STORE_SETTINGS_ID },
    update: {},
    create: { id: STORE_SETTINGS_ID },
  })
}

export async function updateStoreSettingsRecord(patch: StoreSettingsPatch) {
  return prisma.storeSettings.upsert({
    where: { id: STORE_SETTINGS_ID },
    update: patch,
    create: { id: STORE_SETTINGS_ID, ...patch },
  })
}
