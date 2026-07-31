/**
 * Seed de DEMO — catálogo de prueba para validar la tienda sin depender del ERP.
 *
 * Todo lo que crea lleva el prefijo `demo-` (slug) y `DEMO-` (sku), de modo que
 * no colisiona con el catálogo real de Loggro y se puede borrar de un golpe:
 *
 *   npx tsx prisma/seed-demo.ts          → crea/actualiza el catálogo demo
 *   npx tsx prisma/seed-demo.ts --clean  → elimina SOLO lo demo
 *
 * Las fotos son URLs remotas de Unsplash (licencia libre, ya permitido en
 * `next.config.ts` → images.remotePatterns). No se descarga nada al repo.
 */

import { PrismaClient, Prisma, type Gender } from "@prisma/client"

const prisma = new PrismaClient()

/** Prefijos que identifican los registros de demo (usados también al limpiar). */
const SLUG_PREFIX = "demo-"
const SKU_PREFIX = "DEMO-"

/** Pool de fotos verificadas (HTTP 200) de Unsplash. */
const PHOTOS = [
  "photo-1542291026-7eec264c27ff", "photo-1600185365483-26d7a4cc7519",
  "photo-1595950653106-6c9ebd614d3a", "photo-1560769629-975ec94e6a86",
  "photo-1549298916-b41d501d3772", "photo-1608231387042-66d1773070a5",
  "photo-1552346154-21d32810aba3", "photo-1606107557195-0e29a4b5b4aa",
  "photo-1514989940723-e8e51635b782", "photo-1525966222134-fcfa99b8ae77",
  "photo-1551107696-a4b0c5a0d9a2", "photo-1587563871167-1ee9c731aefb",
  "photo-1600269452121-4f2416e55c28", "photo-1584735175315-9d5df23860e6",
  "photo-1595341888016-a392ef81b7de", "photo-1539185441755-769473a23570",
  "photo-1618354691373-d851c5c3a990", "photo-1543508282-6319a3e2621f",
  "photo-1520639888713-7851133b1ed0", "photo-1491553895911-0055eca6402d",
  "photo-1460353581641-37baddab0fa2", "photo-1556906781-9a412961c28c",
  "photo-1465453869711-7e174808ace9", "photo-1562183241-b937e95585b6",
  "photo-1533681904393-9ab6eee7e408", "photo-1512374382149-233c42b6a83b",
  "photo-1608667508764-33cf0726b13a", "photo-1595777457583-95e059d581b8",
  "photo-1603787081207-362bcef7c144", "photo-1596704017254-9b121068fb31",
  "photo-1614252369475-531eba835eb1", "photo-1552066344-2464c1135c32",
  "photo-1610398752800-146f269dfcc8",
] as const

/** Toma una foto del pool de forma estable (rota si se piden más de las que hay). */
function photoUrl(index: number): string {
  const id = PHOTOS[index % PHOTOS.length]
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=900`
}

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

  let photoIndex = 0
  let variantCount = 0

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

    // Las imágenes se regeneran completas: es la forma simple de mantenerlas
    // sincronizadas con la lista de colores sin acumular huérfanas.
    await prisma.productImage.deleteMany({ where: { productId: product.id } })

    let position = 0
    for (const color of item.colors) {
      // Dos fotos por color permite probar la galería y el cambio de miniaturas.
      for (let i = 0; i < 2; i++) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: photoUrl(photoIndex++),
            alt: `${item.name} ${color}`,
            position: position++,
            color,
          },
        })
      }
    }

    for (const color of item.colors) {
      for (const size of SIZES[item.sizes]) {
        const colorCode = color.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)
        const sku = `${SKU_PREFIX}${item.slug.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${colorCode}-${size}`
        await prisma.variant.upsert({
          where: { sku },
          update: { stock: stockFor(sku) },
          create: { sku, size, color, stock: stockFor(sku), productId: product.id },
        })
        variantCount++
      }
    }
  }

  console.log(`✓ ${PRODUCTS.length} productos demo`)
  console.log(`✓ ${variantCount} variantes (talla × color)`)
  console.log(`✓ ${photoIndex} imágenes asociadas por color`)
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
