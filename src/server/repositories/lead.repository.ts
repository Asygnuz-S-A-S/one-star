import "server-only"
import type { LeadStage, Prisma } from "@prisma/client"
import { prisma } from "../db/prisma"
import { normalizeWaPhone } from "../validators/lead.validator"

export interface LeadFilterParams {
  q?: string
  source?: "ALL" | "WHATSAPP" | "CLUB" | "ABANDONED_CART" | "REGISTERED_NO_ORDER"
  stage?: string
  utm?: string
  hasPhone?: boolean
  excludeOptedOut?: boolean
  startDate?: string
  endDate?: string
  take?: number
  skip?: number
}

export interface LeadStats {
  totalLeads: number
  clubMembersCount: number
  abandonedCartsCount: number
  withPhoneCount: number
  convertedCustomersCount: number
  whatsappLeadsCount?: number
}

export interface LeadEventItem {
  id: string
  type: string
  stage: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export function buildPhoneCandidates(phone: string): string[] {
  const digits = normalizeWaPhone(phone)
  if (!digits) return []
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits
  const withCountry = last10.length === 10 ? `57${last10}` : digits
  return Array.from(new Set([digits, last10, withCountry]))
}

export async function findLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
  })
}

export async function findLeadByPhone(waPhone: string) {
  const candidates = buildPhoneCandidates(waPhone)
  if (candidates.length === 0) return null

  const exact = await prisma.lead.findUnique({
    where: { waPhone: candidates[0] },
  })
  if (exact) return exact

  if (candidates.length > 1) {
    return prisma.lead.findFirst({
      where: { waPhone: { in: candidates.slice(1) } },
      orderBy: { updatedAt: "desc" },
    })
  }
  return null
}

export async function findLeadByShortCode(shortCode: string) {
  const trimmed = shortCode.trim()
  if (!trimmed) return null
  return prisma.lead.findUnique({
    where: { shortCode: trimmed },
  })
}

export async function upsertLeadRecord(data: {
  waPhone: string
  name?: string | null
  ctwaClid?: string | null
  consentAt?: Date | null
  optedOut?: boolean
  optedOutAt?: Date | null
  source?: string
}) {
  const now = new Date()
  const updateData: Prisma.LeadUpdateInput = {
    lastInteractionAt: now,
    ...(data.name !== undefined && data.name !== null ? { name: data.name } : {}),
    ...(data.ctwaClid !== undefined && data.ctwaClid !== null ? { ctwaClid: data.ctwaClid } : {}),
    ...(data.consentAt !== undefined ? { consentAt: data.consentAt } : {}),
    ...(data.optedOut !== undefined
      ? {
          optedOut: data.optedOut,
          optedOutAt: data.optedOut ? (data.optedOutAt ?? now) : null,
        }
      : {}),
  }

  return prisma.lead.upsert({
    where: { waPhone: data.waPhone },
    create: {
      waPhone: data.waPhone,
      name: data.name ?? null,
      source: data.source ?? "WHATSAPP",
      stage: "NUEVO",
      ctwaClid: data.ctwaClid ?? null,
      consentAt: data.consentAt ?? null,
      optedOut: data.optedOut ?? false,
      optedOutAt: data.optedOut ? (data.optedOutAt ?? now) : null,
      lastInteractionAt: now,
    },
    update: updateData,
  })
}

export async function updateLeadStageRecord(leadId: string, stage: LeadStage) {
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      stage,
      lastInteractionAt: new Date(),
    },
  })
}

export async function updateLeadShortLinkRecord(
  leadId: string,
  data: {
    shortCode: string
    productSlug: string
    utmSource: string
    utmMedium: string
    utmCampaign: string
    utmContent: string
  }
) {
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      shortCode: data.shortCode,
      productSlug: data.productSlug,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      utmContent: data.utmContent,
      lastInteractionAt: new Date(),
    },
  })
}

export async function updateLeadUtmRecord(
  leadId: string,
  data: {
    utmSource: string
    utmMedium: string
    utmCampaign: string
    utmContent: string
  }
) {
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      utmContent: data.utmContent,
      lastInteractionAt: new Date(),
    },
  })
}

export async function createLeadEventRecord(data: {
  leadId: string
  type: string
  stage?: LeadStage | null
  metadata?: Prisma.InputJsonValue
}) {
  return prisma.leadEvent.create({
    data: {
      leadId: data.leadId,
      type: data.type,
      stage: data.stage ?? null,
      ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
    },
  })
}

export async function attachLeadToOrderRecord(orderId: string, leadId: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: { leadId },
  })
}

export async function findStaleLeadsForAbandonment(before: Date) {
  return prisma.lead.findMany({
    where: {
      stage: { in: ["NUEVO", "INTERESADO", "CARRITO", "CHECKOUT"] },
      lastInteractionAt: { lt: before },
      orders: {
        none: {
          OR: [
            { paymentStatus: "APPROVED" },
            { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
          ],
        },
      },
    },
    select: { id: true, stage: true, waPhone: true },
  })
}

/**
 * Consulta unificada para prospectos que no han completado compras pagadas,
 * carritos abandonados pendientes de recuperación y leads de WhatsApp con UTM y eventos.
 */
export async function getLeadsData(params: LeadFilterParams) {
  const take = params.take ?? 25
  const skip = params.skip ?? 0
  const q = params.q?.trim().toLowerCase() ?? ""
  const utmFilter = params.utm?.trim().toLowerCase() ?? ""

  // 1. Prospectos registrados en User con 0 pedidos pagados
  const userLeads = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      orders: {
        none: {
          status: { in: ["PAID", "SHIPPED", "DELIVERED"] },
        },
      },
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(params.hasPhone ? { phone: { not: null } } : {}),
      ...(params.source === "CLUB" ? { clubMember: true } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      cart: {
        include: {
          items: {
            include: {
              product: { select: { name: true, basePrice: true, salePrice: true, isOnSale: true } },
              variant: { select: { size: true } },
            },
          },
        },
      },
      orders: {
        select: { id: true, status: true, total: true, createdAt: true },
      },
    },
  })

  // 2. Carritos abandonados sin recuperar
  const abandonedCarts = await prisma.abandonedCart.findMany({
    where: {
      recoveredAt: null,
      ...(q ? { email: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  // 3. Leads persistidos de WhatsApp (tabla Lead + LeadEvent)
  const whatsappLeads = prisma.lead?.findMany
    ? await prisma.lead.findMany({
        where: {
          ...(params.excludeOptedOut ? { optedOut: false } : {}),
          ...(q
            ? {
                OR: [
                  { waPhone: { contains: q, mode: "insensitive" } },
                  { name: { contains: q, mode: "insensitive" } },
                  { utmCampaign: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          events: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          orders: {
            select: { id: true, status: true, paymentStatus: true, total: true },
          },
        },
      })
    : []

  // Unificar y mapear Leads
  const userLeadEmails = new Set(userLeads.map((u) => u.email.toLowerCase()))

  const mappedUserLeads = userLeads.map((u) => {
    const cartItems = u.cart?.items ?? []
    const cartValue = cartItems.reduce((sum: number, item) => {
      const price = item.product.isOnSale && item.product.salePrice
        ? Number(item.product.salePrice)
        : Number(item.product.basePrice)
      return sum + price * item.quantity
    }, 0)
    const pendingOrders = u.orders.filter((o) => o.status === "PENDING")

    let stage = "PROSPECTO"
    if (cartItems.length > 0) stage = "CARRITO_ACTIVO"
    if (pendingOrders.length > 0) stage = "CHECKOUT_INICIADO"
    if (u.clubMember && cartItems.length === 0) stage = "CLUB_REGISTRADO"

    return {
      id: `usr_${u.id}`,
      email: u.email,
      name: [u.name, u.lastName].filter(Boolean).join(" ") || "Sin nombre",
      phone: u.phone,
      waPhone: null as string | null,
      source: u.clubMember ? "One Star Club" : "Registro Web",
      stage,
      preferredBrand: u.preferredBrand,
      gender: u.gender,
      hasActiveCart: cartItems.length > 0,
      cartItemCount: cartItems.reduce((acc: number, i) => acc + i.quantity, 0),
      estimatedValue: cartValue,
      utmSource: null as string | null,
      utmMedium: null as string | null,
      utmCampaign: null as string | null,
      utmContent: null as string | null,
      ctwaClid: null as string | null,
      optedOut: false,
      consentAt: null as string | null,
      events: [] as LeadEventItem[],
      createdAt: u.createdAt,
      lastInteraction: u.createdAt,
    }
  })

  // Agregar carritos abandonados que no tengan un usuario ya listado
  const mappedAbandoned = abandonedCarts
    .filter((ac) => !userLeadEmails.has(ac.email.toLowerCase()))
    .map((ac) => {
      let itemsCount = 0
      let estimatedVal = 0

      if (ac.cartData && typeof ac.cartData === "object") {
        const data = ac.cartData as Record<string, unknown>
        if (Array.isArray(data.items)) {
          itemsCount = data.items.length
          estimatedVal = (data.items as Array<Record<string, unknown>>).reduce(
            (sum: number, item: Record<string, unknown>) =>
              sum + Number(item.price ?? item.unitPrice ?? 0) * Number(item.quantity ?? 1),
            0
          )
        } else if (typeof data.total === "number") {
          estimatedVal = data.total
        }
      }

      return {
        id: `ac_${ac.id}`,
        email: ac.email,
        name: "Prospecto Carrito",
        phone: null as string | null,
        waPhone: null as string | null,
        source: "Carrito Abandonado",
        stage: "CARRITO_ABANDONADO",
        preferredBrand: null as string | null,
        gender: null as string | null,
        hasActiveCart: true,
        cartItemCount: itemsCount,
        estimatedValue: estimatedVal,
        utmSource: null as string | null,
        utmMedium: null as string | null,
        utmCampaign: null as string | null,
        utmContent: null as string | null,
        ctwaClid: null as string | null,
        optedOut: false,
        consentAt: null as string | null,
        events: [] as LeadEventItem[],
        createdAt: ac.createdAt,
        lastInteraction: ac.createdAt,
      }
    })

  // Mapear leads de WhatsApp
  const mappedWhatsapp = whatsappLeads.map((wl) => {
    const ordersTotal = (wl.orders ?? []).reduce(
      (sum: number, o: { total?: unknown }) => sum + Number(o.total ?? 0),
      0
    )

    const mappedEvents: LeadEventItem[] = (wl.events ?? []).map((ev) => ({
      id: ev.id,
      type: ev.type,
      stage: ev.stage ?? null,
      metadata:
        ev.metadata && typeof ev.metadata === "object" && !Array.isArray(ev.metadata)
          ? (ev.metadata as Record<string, unknown>)
          : null,
      createdAt: ev.createdAt.toISOString(),
    }))

    return {
      id: `wa_${wl.id}`,
      email: "",
      name: wl.name || "Prospecto WhatsApp",
      phone: wl.waPhone,
      waPhone: wl.waPhone,
      source: "WhatsApp",
      stage: String(wl.stage),
      preferredBrand: null as string | null,
      gender: null as string | null,
      hasActiveCart: wl.stage === "CARRITO" || wl.stage === "CHECKOUT",
      cartItemCount: (wl.orders ?? []).length,
      estimatedValue: ordersTotal,
      utmSource: wl.utmSource ?? null,
      utmMedium: wl.utmMedium ?? null,
      utmCampaign: wl.utmCampaign ?? null,
      utmContent: wl.utmContent ?? null,
      ctwaClid: wl.ctwaClid ?? null,
      optedOut: Boolean(wl.optedOut),
      consentAt: wl.consentAt ? wl.consentAt.toISOString() : null,
      events: mappedEvents,
      createdAt: wl.createdAt,
      lastInteraction: wl.lastInteractionAt ?? wl.updatedAt ?? wl.createdAt,
    }
  })

  let allLeads = [...mappedWhatsapp, ...mappedUserLeads, ...mappedAbandoned]

  if (params.excludeOptedOut) {
    allLeads = allLeads.filter((l) => !l.optedOut)
  }

  if (params.hasPhone) {
    allLeads = allLeads.filter((l) => Boolean(l.phone || l.waPhone))
  }

  // Filtrado por Source si se especificó
  if (params.source === "WHATSAPP") {
    allLeads = allLeads.filter((l) => l.source === "WhatsApp")
  } else if (params.source === "CLUB") {
    allLeads = allLeads.filter((l) => l.source === "One Star Club")
  } else if (params.source === "ABANDONED_CART") {
    allLeads = allLeads.filter(
      (l) =>
        l.stage === "CARRITO_ABANDONADO" ||
        l.stage === "CARRITO_ACTIVO" ||
        l.stage === "ABANDONO" ||
        l.stage === "CARRITO" ||
        l.stage === "CHECKOUT"
    )
  } else if (params.source === "REGISTERED_NO_ORDER") {
    allLeads = allLeads.filter((l) => l.stage === "PROSPECTO" || l.stage === "CLUB_REGISTRADO")
  }

  // Filtrado por Etapa
  if (params.stage && params.stage !== "ALL") {
    allLeads = allLeads.filter((l) => l.stage === params.stage)
  }

  // Filtrado por UTM
  if (utmFilter) {
    allLeads = allLeads.filter((l) =>
      [l.utmSource, l.utmMedium, l.utmCampaign, l.utmContent].some((val) =>
        val ? val.toLowerCase().includes(utmFilter) : false
      )
    )
  }

  // Ordenar por fecha descendente
  allLeads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const total = allLeads.length
  const paginatedLeads = allLeads.slice(skip, skip + take)

  // Métricas globales CRM
  const [totalCustomersWithOrders, totalClubMembers, totalAbandoned, totalWhatsappLeads] =
    await Promise.all([
      prisma.user.count({
        where: {
          orders: { some: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } } },
        },
      }),
      prisma.user.count({ where: { clubMember: true } }),
      prisma.abandonedCart.count({ where: { recoveredAt: null } }),
      prisma.lead?.count ? prisma.lead.count() : Promise.resolve(0),
    ])

  const stats: LeadStats = {
    totalLeads: total,
    clubMembersCount: totalClubMembers,
    abandonedCartsCount: totalAbandoned,
    withPhoneCount: allLeads.filter((l) => Boolean(l.phone || l.waPhone)).length,
    convertedCustomersCount: totalCustomersWithOrders,
    whatsappLeadsCount: totalWhatsappLeads,
  }

  return {
    leads: paginatedLeads.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      lastInteraction: l.lastInteraction.toISOString(),
    })),
    total,
    stats,
  }
}
