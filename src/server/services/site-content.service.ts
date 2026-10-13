import "server-only"
import { revalidatePath } from "next/cache"
import { findSiteContent, upsertSiteContentRecord } from "../repositories/site-content.repository"
import type { UpdateSiteContentInput } from "../validators/site-content.validator"
import {
  DEFAULT_SITE_FAQS,
  DEFAULT_SITE_HIGHLIGHTS,
  RETURN_WINDOW_DAYS,
  type StorePromise,
} from "@/lib/store-promises"
import { parseProductFaqs, type ProductFaq } from "@/lib/product-faq"

export interface SiteContentDTO {
  id: string
  highlights: string[]
  faqs: ProductFaq[]
  promises: StorePromise[] | null
  returnWindowDays: number
  updatedAt?: Date
}

function mapToDTO(raw: {
  id: string
  highlights: string[]
  faqs: unknown
  promises: unknown
  returnWindowDays: number
  updatedAt: Date
} | null): SiteContentDTO {
  if (!raw) {
    return {
      id: "default",
      highlights: DEFAULT_SITE_HIGHLIGHTS,
      faqs: DEFAULT_SITE_FAQS,
      promises: null,
      returnWindowDays: RETURN_WINDOW_DAYS,
    }
  }

  const parsedFaqs = parseProductFaqs(raw.faqs)
  const highlights = raw.highlights && raw.highlights.length > 0 ? raw.highlights : DEFAULT_SITE_HIGHLIGHTS
  const faqs = parsedFaqs.length > 0 ? parsedFaqs : DEFAULT_SITE_FAQS

  let promises: StorePromise[] | null = null
  if (Array.isArray(raw.promises)) {
    promises = raw.promises as StorePromise[]
  }

  return {
    id: raw.id,
    highlights,
    faqs,
    promises,
    returnWindowDays: raw.returnWindowDays || RETURN_WINDOW_DAYS,
    updatedAt: raw.updatedAt,
  }
}

/**
 * Lectura pública de contenido global: seguro y sin escribir en base de datos.
 * Si la base de datos no tiene registro, entrega constantes predeterminadas.
 */
export async function getPublicSiteContent(): Promise<SiteContentDTO> {
  const content = await findSiteContent()
  return mapToDTO(content)
}

export async function getSiteContentForAdmin(): Promise<SiteContentDTO> {
  const content = await findSiteContent()
  return mapToDTO(content)
}

export async function updateSiteContent(input: UpdateSiteContentInput): Promise<SiteContentDTO> {
  const updated = await upsertSiteContentRecord({
    highlights: input.highlights,
    faqs: input.faqs,
    promises: input.promises ?? undefined,
    returnWindowDays: input.returnWindowDays,
  })

  revalidatePath("/", "layout")
  revalidatePath("/productos", "layout")
  revalidatePath("/marcas", "layout")

  return mapToDTO(updated)
}
