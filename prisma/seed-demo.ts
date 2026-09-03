/**
 * Seed de DEMO — catálogo de prueba para validar la tienda sin depender del ERP.
 *
 * Todo lo que crea lleva el prefijo `demo-` (slug) y `DEMO-` (sku), de modo que
 * no colisiona con el catálogo real de Loggro y se puede borrar de un golpe:
 *
 *   npx tsx prisma/seed-demo.ts          → crea/actualiza el catálogo demo
 *   npx tsx prisma/seed-demo.ts --clean  → elimina SOLO lo demo
 *
 * Los productos se crean SIN fotos: las imágenes de banco no corresponden al
 * modelo real y desentonan en la ficha. Se suben a mano desde /admin/productos.
 */

import { PrismaClient, Prisma, type Gender } from "@prisma/client"

const prisma = new PrismaClient()

/** Prefijos que identifican los registros de demo (usados también al limpiar). */
const SLUG_PREFIX = "demo-"
const SKU_PREFIX = "DEMO-"

/** Tallas por tipo de horma. */
const SIZES = {
  hombre: ["39", "40", "41", "42", "43", "44"],
  mujer: ["35", "36", "37", "38", "39", "40"],
  nino: ["28", "30", "32", "34"],
} as const

interface DemoProduct {
  slug: string
  name: string
  brand: string
  /** Slug de la categoría destino (debe existir por el seed principal). */
  category: string
  gender: Gender
  sizes: keyof typeof SIZES
  price: string
  salePrice?: string
  description: string
  /** Nombres EXACTOS de la paleta activa (`ProductColor.name`). */
  colors: string[]
}

const PRODUCTS: DemoProduct[] = [
  {
    slug: "nike-air-max-pulse", name: "Nike Air Max Pulse", brand: "Nike",
    category: "hombre", gender: "HOMBRE", sizes: "hombre", price: "449900.00",
    description: "Inspiradas en la escena musical de Londres, las Air Max Pulse llevan la amortiguación Air a un terreno más crudo y urbano.",
    colors: ["Negro", "Blanco"],
  },
  {
    slug: "nike-dunk-low-retro", name: "Nike Dunk Low Retro", brand: "Nike",
    category: "hombre", gender: "UNISEX", sizes: "hombre", price: "519900.00", salePrice: "429900.00",
    description: "Un ícono de la cancha que pasó al asfalto. Cuero nítido, bloques de color limpios y la comodidad que ya conoces.",
    colors: ["Blanco", "Verde"],
  },
  {
    slug: "adidas-samba-og", name: "Adidas Samba OG", brand: "Adidas",
    category: "lanzamientos", gender: "UNISEX", sizes: "hombre", price: "479900.00",
    description: "La silueta más versátil del momento. Cuero suave, suela de goma y las tres bandas de siempre.",
    colors: ["Negro", "Blanco"],
  },
  {
    slug: "adidas-gazelle-indoor", name: "Adidas Gazelle Indoor", brand: "Adidas",
    category: "mujer", gender: "MUJER", sizes: "mujer", price: "429900.00",
    description: "Gamuza premium y un perfil bajo que combina con todo. Un clásico de los 70 que no pasa de moda.",
    colors: ["Azul", "Rosa"],
  },
  {
    slug: "new-balance-550", name: "New Balance 550", brand: "New Balance",
    category: "hombre", gender: "UNISEX", sizes: "hombre", price: "559900.00", salePrice: "469900.00",
    description: "Rescatadas del archivo de 1989. Estética de básquetbol retro con una construcción de cuero impecable.",
    colors: ["Blanco", "Rojo"],
  },
  {
    slug: "new-balance-9060", name: "New Balance 9060", brand: "New Balance",
    category: "lanzamientos", gender: "UNISEX", sizes: "hombre", price: "689900.00",
    description: "Una relectura exagerada del ADN de la 99X. Curvas pronunciadas y amortiguación ABZORB de altísimo volumen.",
    colors: ["Gris", "Crema"],
  },
  {
    slug: "converse-chuck-70-high", name: "Converse Chuck 70 High", brand: "Converse",
    category: "lanzamientos", gender: "UNISEX", sizes: "hombre", price: "329900.00",
    description: "La versión fiel al original de 1970: lona más gruesa, mejor soporte y la franja de la suela en su lugar exacto.",
    colors: ["Negro", "Crema"],
  },
  {
    slug: "vans-old-skool", name: "Vans Old Skool", brand: "Vans",
    category: "hombre", gender: "UNISEX", sizes: "hombre", price: "299900.00",
    description: "La primera Vans que llevó la franja lateral. Lona y gamuza resistentes para quien no se baja de la tabla.",
    colors: ["Negro", "Azul Marino"],
  },
  {
    slug: "puma-suede-classic", name: "Puma Suede Classic", brand: "Puma",
    category: "hombre", gender: "HOMBRE", sizes: "hombre", price: "349900.00",
    description: "Gamuza, la formstrip de siempre y medio siglo de historia entre la cancha y la cultura callejera.",
    colors: ["Azul Marino", "Café"],
  },
  {
    slug: "nike-air-force-1-shadow", name: "Nike Air Force 1 Shadow", brand: "Nike",
    category: "mujer", gender: "MUJER", sizes: "mujer", price: "599900.00",
    description: "La AF1 de siempre, pero con capas duplicadas y proporciones exageradas. Más volumen, más presencia.",
    colors: ["Blanco", "Rosa"],
  },
  {
    slug: "adidas-forum-low-kids", name: "Adidas Forum Low Kids", brand: "Adidas",
    category: "ninos", gender: "NINO", sizes: "nino", price: "259900.00",
    description: "El ícono de 1984 en versión infantil, con la correa del tobillo que lo hizo inconfundible.",
    colors: ["Blanco", "Celeste"],
  },
  {
    slug: "nike-revolution-7-kids", name: "Nike Revolution 7 Kids", brand: "Nike",
    category: "ninos", gender: "NINO", sizes: "nino", price: "219900.00",
    description: "Livianas, flexibles y con cierre de velcro. Pensadas para el recreo y todo lo que venga después.",
    colors: ["Negro", "Naranja"],
  },
]

/**
 * Tiendas físicas. Coinciden con los establecimientos reales que expone Loggro,
 * para que el mapa de disponibilidad se parezca a lo que habrá en producción.
 */
const STORES = [
  {
    name: "One Star Centro", city: "Medellín",
    address: "Cra. 50 #50-20, La Candelaria", phone: "+57 604 000 0001",
    schedule: "Lun a Sáb 9:00 – 20:00 · Dom 10:00 – 18:00",
  },
  {
    name: "One Star Unicentro", city: "Medellín",
    address: "Cra. 66B #34A-76, Local 220", phone: "+57 604 000 0002",
    schedule: "Lun a Dom 10:00 – 21:00",
  },
  {
    name: "One Star Fundadores", city: "Medellín",
    address: "Cl. 50 #46-36, Centro Comercial Fundadores", phone: "+57 604 000 0003",
    schedule: "Lun a Sáb 9:00 – 20:00",
  },
]

/** Stock pseudoaleatorio pero determinista: mismo SKU → mismo stock en cada corrida. */
function stockFor(sku: string): number {
  let hash = 0
  for (const char of sku) hash = (hash * 31 + char.charCodeAt(0)) % 1000
  // ~15 % de las combinaciones quedan agotadas, para probar ese estado en la UI.
  return hash % 7 === 0 ? 0 : (hash % 12) + 1
}

async function seed(): Promise<void> {
  // Las categorías vienen del seed principal; si falta alguna, se crea al vuelo.
  const categories = new Map<string, string>()
  for (const slug of new Set(PRODUCTS.map((p) => p.category))) {
    const category = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name: slug.charAt(0).toUpperCase() + slug.slice(1), slug },
    })
    categories.set(slug, category.id)
  }

  const brands = new Map<string, string>()
  for (const name of new Set(PRODUCTS.map((p) => p.brand))) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const brand = await prisma.brand.upsert({ where: { slug }, update: {}, create: { name, slug } })
    brands.set(name, brand.id)
  }

  // Tiendas físicas: sin índice único por nombre, así que se busca antes de crear.
  const storeIds: string[] = []
  for (const store of STORES) {
    const existing = await prisma.storeLocation.findFirst({ where: { name: store.name } })
    const record = existing
      ? await prisma.storeLocation.update({ where: { id: existing.id }, data: store })
      : await prisma.storeLocation.create({ data: store })
    storeIds.push(record.id)
  }

  let variantCount = 0
  let inventoryCount = 0

  for (const item of PRODUCTS) {
    const slug = `${SLUG_PREFIX}${item.slug}`

    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name: item.name,
        basePrice: new Prisma.Decimal(item.price),
        isOnSale: Boolean(item.salePrice),
        salePrice: item.salePrice ? new Prisma.Decimal(item.salePrice) : null,
        description: item.description,
        brandId: brands.get(item.brand)!,
      },
      create: {
        slug,
        name: item.name,
        basePrice: new Prisma.Decimal(item.price),
        isOnSale: Boolean(item.salePrice),
        salePrice: item.salePrice ? new Prisma.Decimal(item.salePrice) : null,
        description: item.description,
        gender: item.gender,
        categoryId: categories.get(item.category)!,
        brandId: brands.get(item.brand)!,
      },
    })

    // Los productos demo se crean SIN fotos a propósito: las de banco no
    // corresponden al modelo real y se ven fuera de lugar. Las imágenes se
    // suben a mano desde /admin/productos.
    await prisma.productImage.deleteMany({ where: { productId: product.id } })

    for (const color of item.colors) {
      for (const size of SIZES[item.sizes]) {
        const colorCode = color.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)
        const sku = `${SKU_PREFIX}${item.slug.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${colorCode}-${size}`
        const stock = stockFor(sku)
        const variant = await prisma.variant.upsert({
          where: { sku },
          update: { stock },
          create: { sku, size, color, stock, productId: product.id },
        })
        variantCount++

        // El inventario se regenera completo. `@@unique([variantId, storeLocationId])`
        // no protege contra duplicados cuando la tienda es NULL (bodega web), así
        // que borrar y recrear es la vía fiable para mantener la idempotencia.
        await prisma.inventoryLevel.deleteMany({ where: { variantId: variant.id } })

        // storeLocationId null = bodega web: es el stock que habilita la venta en línea.
        await prisma.inventoryLevel.create({
          data: { variantId: variant.id, storeLocationId: null, stock },
        })
        inventoryCount++

        // Reparto en tiendas físicas: no todas las sedes tienen todas las tallas,
        // para que el mapa de disponibilidad muestre resultados variados.
        for (const [i, storeLocationId] of storeIds.entries()) {
          if ((stock + i) % 3 === 0) continue
          await prisma.inventoryLevel.create({
            data: { variantId: variant.id, storeLocationId, stock: Math.max(0, stock - i * 2) },
          })
          inventoryCount++
        }
      }
    }
  }

  console.log(`✓ ${PRODUCTS.length} productos demo`)
  console.log(`✓ ${variantCount} variantes (talla × color)`)
  console.log("✓ sin imágenes — se suben a mano desde /admin/productos")
  console.log(`✓ ${STORES.length} tiendas físicas`)
  console.log(`✓ ${inventoryCount} registros de inventario (web + tiendas)`)
}

async function clean(): Promise<void> {
  // Las variantes e imágenes caen en cascada al borrar el producto.
  const { count } = await prisma.product.deleteMany({
    where: { slug: { startsWith: SLUG_PREFIX } },
  })
  console.log(`✓ ${count} productos demo eliminados (variantes e imágenes en cascada)`)
}

const isClean = process.argv.includes("--clean")

;(isClean ? clean() : seed())
  .catch((err) => {
    console.error("✗ Seed demo falló:", err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
