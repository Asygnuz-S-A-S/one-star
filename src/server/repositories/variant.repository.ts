import "server-only"
import { prisma } from "../db/prisma"
import type { Variant } from "@prisma/client"

export async function findManyVariants(): Promise<Variant[]> {
  return prisma.variant.findMany()
}

export async function getUniqueSizes(): Promise<string[]> {
  const variants = await prisma.variant.findMany({
    select: { size: true },
    distinct: ["size"],
  })
  return variants.map(v => v.size).filter(Boolean)
}

export async function getUniqueColors(): Promise<string[]> {
  const variants = await prisma.variant.findMany({
    select: { color: true },
    distinct: ["color"],
  })
  return variants.map(v => v.color).filter(Boolean)
}

export async function countVariants(): Promise<number> {
  return prisma.variant.count()
}
