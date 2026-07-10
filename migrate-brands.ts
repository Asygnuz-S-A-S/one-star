import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-")
}

async function main() {
  const products = await prisma.product.findMany({
    where: {
      legacyBrand: { not: null }
    }
  })

  const uniqueBrands = new Set<string>()
  for (const product of products) {
    if (product.legacyBrand) uniqueBrands.add(product.legacyBrand)
  }

  console.log(`Found ${uniqueBrands.size} unique brands to migrate.`)

  for (const brandName of uniqueBrands) {
    const slug = slugify(brandName)
    const brand = await prisma.brand.upsert({
      where: { slug },
      update: {},
      create: { name: brandName, slug }
    })
    
    const updateResult = await prisma.product.updateMany({
      where: { legacyBrand: brandName },
      data: { brandId: brand.id }
    })
    console.log(`Migrated ${updateResult.count} products for brand: ${brandName}`)
  }

  console.log("Migration completed.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
