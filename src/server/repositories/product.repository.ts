import { prisma } from "../db/prisma";
import type { ProductQuery } from "../validators/product.validator";

/*
 * El repositorio es la única capa que toca Prisma directamente.
 * Devuelve tipos Prisma crudos (con Decimal); el service los convierte a DTOs.
 */

const productInclude = {
  category: true,
  images: { orderBy: { position: "asc" } },
  variants: true,
} as const;

export async function findManyProducts(filter: ProductQuery) {
  return prisma.product.findMany({
    where: filter.category
      ? { category: { slug: filter.category } }
      : undefined,
    include: productInclude,
    take: filter.take,
    skip: filter.skip,
    orderBy: { createdAt: "desc" },
  });
}

export async function findProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: productInclude,
  });
}
