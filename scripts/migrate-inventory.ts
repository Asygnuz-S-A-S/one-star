import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Migrating Variant.stock to InventoryLevel...")
  
  const variants = await prisma.variant.findMany()
  let migrated = 0
  
  for (const variant of variants) {
    const existing = await prisma.inventoryLevel.findFirst({
      where: { variantId: variant.id, storeLocationId: null }
    })
    
    if (!existing) {
      await prisma.inventoryLevel.create({
        data: {
          variantId: variant.id,
          storeLocationId: null, // Web Warehouse
          stock: variant.stock
        }
      })
      migrated++
    }
  }
  
  console.log(`Migrated ${migrated} variants.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
