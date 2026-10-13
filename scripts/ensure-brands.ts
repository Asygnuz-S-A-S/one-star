import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/**
 * Marcas esenciales que deben asegurarse en la base de datos de manera idempotente.
 */
const BRANDS_TO_ENSURE = [
  {
    name: "New Balance",
    slug: "new-balance",
    description: "Calzado deportivo y urbano de alto rendimiento con tecnología y confort icónico.",
  },
  {
    name: "On",
    slug: "on",
    description: "Zapatillas suizas de alto rendimiento diseñadas para transformar la sensación del running con tecnología CloudTec.",
  },
]

async function main() {
  console.log("Asegurando marcas base de One Star...")

  for (const brand of BRANDS_TO_ENSURE) {
    const existing = await prisma.brand.findUnique({
      where: { slug: brand.slug },
    })

    if (existing) {
      console.log(`- Marca ya existente: ${existing.name} (slug: ${existing.slug}, id: ${existing.id}) [sin cambios]`)
    } else {
      const created = await prisma.brand.create({
        data: {
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          isActive: true,
        },
      })
      console.log(`+ Marca creada con éxito: ${created.name} (slug: ${created.slug}, id: ${created.id})`)
    }
  }

  console.log("Proceso de aseguramiento de marcas finalizado.")
}

main()
  .catch((error) => {
    console.error("Error asegurando marcas:", error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
