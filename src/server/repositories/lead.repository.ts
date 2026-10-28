import "server-only"
import { prisma } from "../db/prisma"

export interface LeadFilterParams {
  q?: string
  source?: "ALL" | "CLUB" | "ABANDONED_CART" | "REGISTERED_NO_ORDER"
  hasPhone?: boolean
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
}

/**
 * Consulta unificada para prospectos que no han completado compras pagadas,
 * o carritos abandonados pendientes de recuperación.
 */
export async function getLeadsData(params: LeadFilterParams) {
  const take = params.take ?? 25
  const skip = params.skip ?? 0
  const q = params.q?.trim().toLowerCase() ?? ""

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
      source: u.clubMember ? "One Star Club" : "Registro Web",
      stage,
      preferredBrand: u.preferredBrand,
      gender: u.gender,
      hasActiveCart: cartItems.length > 0,
      cartItemCount: cartItems.reduce((acc: number, i) => acc + i.quantity, 0),
      estimatedValue: cartValue,
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
        source: "Carrito Abandonado",
        stage: "CARRITO_ABANDONADO",
        preferredBrand: null as string | null,
        gender: null as string | null,
        hasActiveCart: true,
        cartItemCount: itemsCount,
        estimatedValue: estimatedVal,
        createdAt: ac.createdAt,
        lastInteraction: ac.createdAt,
      }
    })

  let allLeads = [...mappedUserLeads, ...mappedAbandoned]

  // Filtrado por Source si se especificó
  if (params.source === "CLUB") {
    allLeads = allLeads.filter((l) => l.source === "One Star Club")
  } else if (params.source === "ABANDONED_CART") {
    allLeads = allLeads.filter((l) => l.stage === "CARRITO_ABANDONADO" || l.stage === "CARRITO_ACTIVO")
  } else if (params.source === "REGISTERED_NO_ORDER") {
    allLeads = allLeads.filter((l) => l.stage === "PROSPECTO" || l.stage === "CLUB_REGISTRADO")
  }

  // Ordenar por fecha descendente
  allLeads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const total = allLeads.length
  const paginatedLeads = allLeads.slice(skip, skip + take)

  // Métricas globales CRM
  const [totalCustomersWithOrders, totalClubMembers, totalAbandoned] = await Promise.all([
    prisma.user.count({
      where: {
        orders: { some: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } } },
      },
    }),
    prisma.user.count({ where: { clubMember: true } }),
    prisma.abandonedCart.count({ where: { recoveredAt: null } }),
  ])

  const stats: LeadStats = {
    totalLeads: total,
    clubMembersCount: totalClubMembers,
    abandonedCartsCount: totalAbandoned,
    withPhoneCount: allLeads.filter((l) => Boolean(l.phone)).length,
    convertedCustomersCount: totalCustomersWithOrders,
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
