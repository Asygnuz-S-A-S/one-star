import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/**
 * Normaliza y extrae el nombre base de un producto eliminando sufijos de color comunes.
 */
function extractBaseModelName(name: string): string {
  return name
    .toUpperCase()
    .replace(
      /\b(NEGRO|BLANCO|BEIGE|AZUL|ROJO|GRIS|VERDE|ROSADO|CAFE|LILA|AMARILLO|VINO TINTO|HABANO|ORO|PLATA|"LEOPARD BLACK"|LEOPARD BLACK|FULL NEGRO|TEXTIL|CUERO CLASICO|CLASICO|PLATAFORMA|CUADROS|CROSSPATH|CARAMELO|LLOVIZNA|MUSTARD SEED|TIDAL WAVE|HOMBRE|MUJER|UNISEX|UNIEX|DAMA)\b/gi,
      ""
    )
    .replace(/[/\-_,"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function main() {
  console.log("Iniciando auto-agrupación de familias de color...")

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      brandId: true,
      brand: { select: { name: true } },
      colorFamilyId: true,
    },
  })

  const groups = new Map<string, typeof products>()

  for (const p of products) {
    const brandPrefix = p.brand?.name ?? "GENERAL"
    const baseModel = extractBaseModelName(p.name)
    if (!baseModel) continue

    const key = `${brandPrefix.toUpperCase()}::${baseModel}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  let familiesCreated = 0
  let productsLinked = 0

  for (const [key, prods] of groups.entries()) {
    if (prods.length < 2) continue

    // Verificar si alguno ya tiene colorFamilyId
    const existingFamilyId = prods.find((p) => p.colorFamilyId)?.colorFamilyId
    let targetFamilyId = existingFamilyId

    if (!targetFamilyId) {
      const newFamily = await prisma.productColorFamily.create({ data: {} })
      targetFamilyId = newFamily.id
      familiesCreated++
    }

    const prodsToUpdate = prods.filter((p) => p.colorFamilyId !== targetFamilyId)
    if (prodsToUpdate.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: prodsToUpdate.map((p) => p.id) } },
        data: { colorFamilyId: targetFamilyId },
      })
      productsLinked += prodsToUpdate.length
      console.log(`Grupo [${key}]: ${prods.length} productos vinculados a la familia ${targetFamilyId}`)
      prods.forEach((p) => console.log(`  - ${p.name}`))
    }
  }

  console.log(`\nFinalizado: ${familiesCreated} familias creadas, ${productsLinked} productos asociados.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
