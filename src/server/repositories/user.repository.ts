import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma, User } from "@prisma/client"

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } })
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } })
}

/** Cliente por correo sin distinguir mayúsculas (recuperación de contraseña). */
export async function findCustomerByEmailInsensitive(email: string): Promise<User | null> {
  return prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, role: "CUSTOMER" } })
}

/**
 * Cambia la contraseña del cliente en la tienda y en la credencial de better-auth.
 * Sin lo segundo, la clave vieja seguiría sirviendo en /api/auth/sign-in/email
 * hasta el siguiente login por la tienda.
 */
export async function setUserPasswordHash(id: string, passwordHash: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const { email } = await tx.user.update({ where: { id }, data: { passwordHash }, select: { email: true } })
    await tx.authAccount.updateMany({
      where: { providerId: "credential", user: { email } },
      data: { password: passwordHash, updatedAt: new Date() },
    })
  })
}

/** Cierra todas las sesiones del cliente (tras restablecer la contraseña). */
export async function deleteSessionsByUserEmail(email: string): Promise<number> {
  const result = await prisma.authSession.deleteMany({ where: { user: { email } } })
  return result.count
}

export async function createUser(data: Prisma.UserCreateInput): Promise<User> {
  return prisma.user.create({ data })
}

export async function updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
  return prisma.user.update({ where: { id }, data })
}

export async function countUsers(): Promise<number> {
  return prisma.user.count()
}

export async function findManyCustomers(
  where: Prisma.UserWhereInput,
  take: number,
  skip: number
) {
  return prisma.user.findMany({
    where,
    take,
    skip,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true } },
      orders: {
        where: { status: { not: "CANCELLED" } },
        select: { total: true },
      },
    },
  })
}

export async function countCustomers(where: Prisma.UserWhereInput): Promise<number> {
  return prisma.user.count({ where })
}

export async function findCustomerProfileById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: { include: { product: true } },
        },
      },
      cart: {
        include: {
          items: {
            include: {
              product: {
                include: { images: { orderBy: { position: "asc" }, take: 1 } },
              },
              variant: true,
            },
          },
        },
      },
    },
  })
}

export async function findNewsletterSubscribers() {
  return prisma.user.findMany({
    where: { role: "CUSTOMER", marketingConsentAt: { not: null } },
    select: { email: true, name: true, lastName: true, clubMember: true, marketingConsentAt: true },
    orderBy: { marketingConsentAt: "desc" },
  })
}
