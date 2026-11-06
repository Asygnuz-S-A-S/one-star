import "server-only"
import { prisma } from "@/server/db/prisma"

/** Todos los clientes con cuenta: su consentimiento manda sobre el de sus compras como invitado. */
export function findCustomersForMarketing() {
  return prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { email: true, name: true, lastName: true, clubMember: true, marketingConsentAt: true },
  })
}

/** Compras como invitado en las que la persona aceptó publicidad. */
export function findConsentedGuestOrders() {
  return prisma.order.findMany({
    where: { userId: null, marketingConsentAt: { not: null }, customerEmail: { not: null } },
    select: { customerEmail: true, customerName: true },
  })
}

/** Ventas reales (pago aprobado) con las marcas compradas, para propiedades y segmentos. */
export function findPaidOrdersForMarketing() {
  return prisma.order.findMany({
    where: { paymentStatus: "APPROVED" },
    select: {
      customerEmail: true,
      total: true,
      paidAt: true,
      createdAt: true,
      user: { select: { email: true } },
      items: { select: { product: { select: { brand: { select: { name: true } } } } } },
    },
  })
}
