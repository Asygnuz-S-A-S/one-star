import "server-only"

import type { Resend } from "resend"
import { getResendClient } from "@/server/email/resend.client"
import {
  findConsentedGuestOrders,
  findCustomersForMarketing,
  findPaidOrdersForMarketing,
} from "@/server/repositories/marketing.repository"

/**
 * Email marketing con Resend: la tienda decide QUIÉN puede recibir publicidad
 * (solo con consentimiento) y en qué segmentos va; las campañas se diseñan y
 * envían desde Broadcasts en el panel de Resend.
 */

export const SEGMENT = {
  newsletter: "Newsletter (todos)",
  club: "One Star Club",
  buyers: "Compradores",
  noPurchase: "Sin compras",
  inactive: "Sin compra hace 90+ días",
} as const
export const BRAND_SEGMENT_PREFIX = "Marca: "
const INACTIVE_DAYS = 90
const MANAGED_NAMES = new Set<string>(Object.values(SEGMENT))
const isManagedSegment = (name: string) => MANAGED_NAMES.has(name) || name.startsWith(BRAND_SEGMENT_PREFIX)

/** Propiedades que se cargan en cada contacto de Resend (sirven como variables en las campañas). */
const PROPERTIES = [
  { key: "es_club", type: "string" },
  { key: "compras", type: "number" },
  { key: "total_gastado", type: "number" },
  { key: "ultima_compra", type: "string" },
  { key: "marcas", type: "string" },
] as const

export interface MarketingContact {
  email: string
  firstName: string
  lastName: string
  club: boolean
  orders: number
  totalSpent: number
  /** AAAA-MM-DD o "" si nunca compró. */
  lastPurchase: string
  brands: string[]
  segments: string[]
}

interface AudienceInput {
  customers: { email: string; name: string | null; lastName: string | null; clubMember: boolean; marketingConsentAt: Date | null }[]
  guestOrders: { customerEmail: string | null; customerName: string | null }[]
  paidOrders: {
    customerEmail: string | null
    total: unknown
    paidAt: Date | null
    createdAt: Date
    user: { email: string } | null
    items: { product: { brand: { name: string } | null } | null }[]
  }[]
  now?: Date
}

const norm = (email: string) => email.trim().toLowerCase()

/**
 * Arma la audiencia con consentimiento y sus segmentos. Regla: si el correo
 * tiene cuenta, manda el consentimiento de la cuenta; si no, basta una compra
 * como invitado con la casilla de publicidad marcada.
 */
export function buildMarketingAudience({ customers, guestOrders, paidOrders, now = new Date() }: AudienceInput): MarketingContact[] {
  const byEmail = new Map<string, { firstName: string; lastName: string; club: boolean }>()
  const withAccount = new Set<string>()

  for (const c of customers) {
    const email = norm(c.email)
    withAccount.add(email)
    if (c.marketingConsentAt) {
      byEmail.set(email, { firstName: c.name?.trim() ?? "", lastName: c.lastName?.trim() ?? "", club: c.clubMember })
    }
  }
  for (const o of guestOrders) {
    if (!o.customerEmail) continue
    const email = norm(o.customerEmail)
    if (withAccount.has(email) || byEmail.has(email)) continue
    const [first = "", ...rest] = (o.customerName ?? "").trim().split(/\s+/)
    byEmail.set(email, { firstName: first, lastName: rest.join(" "), club: false })
  }

  const stats = new Map<string, { orders: number; total: number; last: Date | null; brands: Set<string> }>()
  for (const o of paidOrders) {
    const raw = o.customerEmail ?? o.user?.email
    if (!raw) continue
    const email = norm(raw)
    if (!byEmail.has(email)) continue
    const s = stats.get(email) ?? { orders: 0, total: 0, last: null, brands: new Set<string>() }
    const when = o.paidAt ?? o.createdAt
    s.orders += 1
    s.total += Number(o.total) || 0
    if (!s.last || when > s.last) s.last = when
    for (const item of o.items) {
      const brand = item.product?.brand?.name?.trim()
      if (brand) s.brands.add(brand)
    }
    stats.set(email, s)
  }

  const inactiveBefore = now.getTime() - INACTIVE_DAYS * 24 * 60 * 60 * 1000
  return [...byEmail.entries()]
    .map(([email, person]) => {
      const s = stats.get(email)
      const brands = s ? [...s.brands].sort() : []
      const segments: string[] = [SEGMENT.newsletter]
      if (person.club) segments.push(SEGMENT.club)
      if (s) {
        segments.push(SEGMENT.buyers)
        if (s.last && s.last.getTime() < inactiveBefore) segments.push(SEGMENT.inactive)
      } else {
        segments.push(SEGMENT.noPurchase)
      }
      for (const brand of brands) segments.push(`${BRAND_SEGMENT_PREFIX}${brand}`)
      return {
        email,
        ...person,
        orders: s?.orders ?? 0,
        totalSpent: Math.round(s?.total ?? 0),
        lastPurchase: s?.last ? s.last.toISOString().slice(0, 10) : "",
        brands,
        segments,
      }
    })
    .sort((a, b) => a.email.localeCompare(b.email))
}

export async function getMarketingAudience(): Promise<MarketingContact[]> {
  const [customers, guestOrders, paidOrders] = await Promise.all([
    findCustomersForMarketing(),
    findConsentedGuestOrders(),
    findPaidOrdersForMarketing(),
  ])
  return buildMarketingAudience({ customers, guestOrders, paidOrders })
}

/** Conteo por segmento para el panel (sin llamar a Resend). */
export function countBySegment(contacts: MarketingContact[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const c of contacts) for (const s of c.segments) counts.set(s, (counts.get(s) ?? 0) + 1)
  const fixed = Object.values(SEGMENT).map((name) => ({ name, count: counts.get(name) ?? 0 }))
  const brands = [...counts.entries()]
    .filter(([name]) => name.startsWith(BRAND_SEGMENT_PREFIX))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  return [...fixed, ...brands]
}

// ─── Resend ────────────────────────────────────────────────────────────────

type ResendResult<T> = { data: T | null; error: { message: string; name: string } | null }

/** Llama a Resend en serie y reintenta si responde «demasiadas solicitudes». */
async function call<T>(fn: () => Promise<ResendResult<T>>, what: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const { data, error } = await fn()
    if (!error) return data as T
    if (error.name === "rate_limit_exceeded" && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      continue
    }
    throw new Error(`Resend (${what}): ${error.message}`)
  }
}

async function listAll<T extends { id: string }>(
  page: (after?: string) => Promise<ResendResult<{ data: T[]; has_more: boolean }>>,
  what: string
): Promise<T[]> {
  const items: T[] = []
  let after: string | undefined
  for (;;) {
    const res = await call(() => page(after), what)
    items.push(...res.data)
    if (!res.has_more || res.data.length === 0) return items
    after = res.data[res.data.length - 1].id
  }
}

function requireResend(): Resend {
  const resend = getResendClient()
  if (!resend) throw new Error("Falta RESEND_API_KEY en el servidor.")
  return resend
}

const csvCell = (value: string | number) => {
  // Un nombre que empieza por = + - @ se volvería fórmula si alguien exporta los contactos a Excel.
  const text = typeof value === "number" ? String(value) : value.replace(/^[=+\-@\t\r]+/, "")
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(contacts: MarketingContact[]): Blob {
  const header = "email,first_name,last_name,es_club,compras,total_gastado,ultima_compra,marcas"
  const rows = contacts.map((c) =>
    [c.email, c.firstName, c.lastName, c.club ? "si" : "no", c.orders, c.totalSpent, c.lastPurchase, c.brands.join(" | ")]
      .map(csvCell)
      .join(",")
  )
  return new Blob([[header, ...rows].join("\n")], { type: "text/csv" })
}

export interface MarketingSyncResult {
  contacts: number
  segments: { name: string; count: number }[]
  removedFromSegments: number
  unsubscribed: number
}

/**
 * Sube la audiencia con consentimiento a Resend: crea propiedades y segmentos
 * que falten, importa cada segmento (upsert) y saca de los segmentos a quien ya
 * no aplica. Quien ya no tiene consentimiento queda «unsubscribed» en Resend.
 * No toca el estado «unsubscribed» de quien sí está: una baja hecha en Resend se respeta.
 */
export async function syncMarketingToResend(): Promise<MarketingSyncResult> {
  const resend = requireResend()
  const audience = await getMarketingAudience()
  const segments = countBySegment(audience).filter((s) => s.count > 0)

  // 1. Propiedades
  const existingProps = await call(() => resend.contactProperties.list({ limit: 100 }), "propiedades")
  const propKeys = new Set(existingProps.data.map((p) => p.key))
  for (const prop of PROPERTIES) {
    if (!propKeys.has(prop.key)) await call(() => resend.contactProperties.create({ ...prop }), `crear propiedad ${prop.key}`)
  }

  // 2. Segmentos
  const allSegments = await listAll((after) => resend.segments.list(after ? { limit: 100, after } : { limit: 100 }), "segmentos")
  const segmentId = new Map(allSegments.filter((s) => isManagedSegment(s.name)).map((s) => [s.name, s.id]))
  for (const { name } of segments) {
    if (!segmentId.has(name)) {
      const created = await call(() => resend.segments.create({ name }), `crear segmento ${name}`)
      segmentId.set(name, created.id)
    }
  }

  // 3. Importar cada segmento (crea o actualiza contactos con sus propiedades)
  const columnMap = {
    email: "email",
    firstName: "first_name",
    lastName: "last_name",
    properties: {
      es_club: { column: "es_club", type: "string" as const },
      compras: { column: "compras", type: "number" as const },
      total_gastado: { column: "total_gastado", type: "number" as const },
      ultima_compra: { column: "ultima_compra", type: "string" as const },
      marcas: { column: "marcas", type: "string" as const },
    },
  }
  for (const { name } of segments) {
    const members = audience.filter((c) => c.segments.includes(name))
    await call(
      () =>
        resend.contacts.imports.create({
          file: toCsv(members),
          columnMap,
          onConflict: "upsert",
          segments: [{ id: segmentId.get(name)! }],
        }),
      `importar ${name}`
    )
  }

  // 4. Sacar de cada segmento administrado a quien ya no aplica
  const desired = new Map(audience.map((c) => [c.email, new Set(c.segments)]))
  let removedFromSegments = 0
  for (const [name, id] of segmentId) {
    const members = await listAll((after) => resend.contacts.list(after ? { segmentId: id, limit: 100, after } : { segmentId: id, limit: 100 }), `miembros ${name}`)
    for (const member of members) {
      if (desired.get(norm(member.email))?.has(name)) continue
      await call(() => resend.contacts.segments.remove({ email: member.email, segmentId: id }), `sacar de ${name}`)
      removedFromSegments++
    }
  }

  // 5. Sin consentimiento → unsubscribed (nunca se borra: así no se le vuelve a escribir)
  const everyone = await listAll((after) => resend.contacts.list(after ? { limit: 100, after } : { limit: 100 }), "contactos")
  let unsubscribed = 0
  for (const contact of everyone) {
    if (contact.unsubscribed || desired.has(norm(contact.email))) continue
    await call(() => resend.contacts.update({ email: contact.email, unsubscribed: true }), "dar de baja")
    unsubscribed++
  }

  return { contacts: audience.length, segments, removedFromSegments, unsubscribed }
}

/** Baja inmediata en Resend cuando la persona retira el consentimiento en la tienda. */
export async function unsubscribeMarketingContact(email: string): Promise<void> {
  const resend = getResendClient()
  if (!resend) return
  const { error } = await resend.contacts.update({ email: norm(email), unsubscribed: true })
  // not_found = nunca se sincronizó: no hay nada que dar de baja.
  if (error && error.name !== "not_found") throw new Error(`Resend (baja): ${error.message}`)
}
