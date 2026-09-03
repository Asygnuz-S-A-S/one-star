import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma, User } from "@prisma/client"

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } })
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } })
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
