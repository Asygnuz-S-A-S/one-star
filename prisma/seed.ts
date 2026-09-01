import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // ── Categorías ─────────────────────────────────────────────────────────────
  const [, hombre, mujer] = await Promise.all([
    prisma.category.upsert({
      where: { slug: "lanzamientos" },
      update: {},
      create: { name: "Lanzamientos", slug: "lanzamientos" },
    }),
    prisma.category.upsert({
      where: { slug: "hombre" },
      update: {},
      create: { name: "Hombre", slug: "hombre" },
    }),
    prisma.category.upsert({
      where: { slug: "mujer" },
      update: {},
      create: { name: "Mujer", slug: "mujer" },
    }),
    prisma.category.upsert({
      where: { slug: "ninos" },
      update: {},
      create: { name: "Niños", slug: "ninos" },
    }),
    prisma.category.upsert({
      where: { slug: "accesorios" },
      update: {},
      create: { name: "Accesorios", slug: "accesorios" },
    }),
  ]);

  console.log("✓ 5 categorías listas");

  // ── Productos ──────────────────────────────────────────────────────────────
  // Nota: los precios están en COP (pesos colombianos)
  // Los imágenes usan rutas placeholder; se reemplazarán con assets reales en Fase 3.
  const products = [
    {
      slug: "nike-air-force-1-07",
      name: "Nike Air Force 1 '07",
      basePrice: new Prisma.Decimal("529900.00"),
      isOnSale: false,
      salePrice: null,
      createdAt: new Date(),
      description: "La leyenda sigue viva con las zapatillas Nike Air Force 1 '07, una versión moderna del icónico modelo de la AF1 que combina su estilo clásico con nuevos detalles.",
      categoryId: hombre.id,
      images: [
        { url: "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/b7d9211c-26e7-431a-ac24-b0540fb3c00f/AIR+FORCE+1+%2707.png", alt: "Air Force 1 Frontal", position: 0 },
        { url: "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/33533fe2-1157-4001-896e-1803b30659c8/AIR+FORCE+1+%2707.png", alt: "Air Force 1 Lateral", position: 1 },
      ],
      variants: [
        { sku: "AF1-40",  size: "40",  color: "Blanco", stock: 15 },
        { sku: "AF1-41",  size: "41",  color: "Blanco", stock: 10 },
        { sku: "AF1-42",  size: "42",  color: "Blanco", stock: 8  },
      ],
    },
    {
      slug: "air-jordan-1-retro-high",
      name: "Air Jordan 1 Retro High",
      basePrice: new Prisma.Decimal("849900.00"),
      isOnSale: true,
      salePrice: new Prisma.Decimal("699900.00"),
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      description: "Las Air Jordan 1 Retro High OG combinan un diseño clásico con un toque moderno. Cuentan con materiales de primera calidad para una mayor comodidad y estilo.",
      categoryId: hombre.id,
      images: [
        { url: "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/57f44d82-df51-4053-90d5-53df8a5e305e/AIR+JORDAN+1+RETRO+HIGH+OG.png", alt: "Jordan 1 Frontal", position: 0 },
        { url: "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/cd8aeb1d-fc37-4d9f-a2e6-5c68fce14152/AIR+JORDAN+1+RETRO+HIGH+OG.png", alt: "Jordan 1 Lateral", position: 1 },
      ],
      variants: [
        { sku: "AJ1-40",  size: "40",  color: "Rojo/Negro", stock: 0 },
        { sku: "AJ1-42",  size: "42",  color: "Rojo/Negro", stock: 0 },
      ],
    },
    {
      slug: "adidas-superstar-vegan",
      name: "Adidas Superstar Vegan",
      basePrice: new Prisma.Decimal("429900.00"),
      isOnSale: false,
      salePrice: null,
      description: "Un clásico desde los 70, ahora hecho sin utilizar productos de origen animal. Mantienen el diseño icónico de la puntera de goma.",
      categoryId: mujer.id,
      images: [
        { url: "https://images.unsplash.com/photo-1618214227845-a764d2547b74?auto=format&fit=crop&q=80&w=800", alt: "Adidas Superstar", position: 0 },
        { url: "https://images.unsplash.com/photo-1639016147683-1678864757c3?auto=format&fit=crop&q=80&w=800", alt: "Adidas Superstar Detalle", position: 1 },
      ],
      variants: [
        { sku: "SS-36",  size: "36",  color: "Blanco/Negro", stock: 12 },
        { sku: "SS-38",  size: "38",  color: "Blanco/Negro", stock: 14 },
      ],
    },
    {
      slug: "new-balance-550",
      name: "New Balance 550",
      basePrice: new Prisma.Decimal("629900.00"),
      isOnSale: true,
      salePrice: new Prisma.Decimal("499900.00"),
      createdAt: new Date(),
      description: "El modelo 550 original debutó en 1989 y dejó su huella en las canchas de baloncesto de todo el país.",
      categoryId: hombre.id,
      images: [
        { url: "https://nb.scene7.com/is/image/NB/bb550wtg_nb_02_i?$dw_detail_main_lg$&bgc=f1f1f1&layer=1&bgcolor=f1f1f1&blendMode=mult&scale=10&wid=1600&hei=1600", alt: "New Balance 550", position: 0 },
        { url: "https://nb.scene7.com/is/image/NB/bb550wtg_nb_04_i?$dw_detail_main_lg$&bgc=f1f1f1&layer=1&bgcolor=f1f1f1&blendMode=mult&scale=10&wid=1600&hei=1600", alt: "NB 550 Detalle", position: 1 },
      ],
      variants: [
        { sku: "NB-41",  size: "41",  color: "Blanco/Verde", stock: 12 },
        { sku: "NB-43",  size: "43",  color: "Blanco/Verde", stock: 5 },
      ],
    },
  ];

  for (const { images, variants, ...fields } of products) {
    // Upsert del producto (por slug)
    const product = await prisma.product.upsert({
      where: { slug: fields.slug },
      update: {
        name: fields.name,
        basePrice: fields.basePrice,
        isOnSale: fields.isOnSale,
        salePrice: fields.salePrice,
        description: fields.description,
      },
      create: {
        ...fields,
        images: { create: images },
      },
    });

    // Upsert de variantes (por sku) — idempotente en actualizaciones de stock
    for (const variant of variants) {
      await prisma.variant.upsert({
        where: { sku: variant.sku },
        update: { stock: variant.stock },
        create: { ...variant, productId: product.id },
      });
    }
  }

  console.log("✓ 4 productos y sus variantes listos");

  // ── GiftCard ───────────────────────────────────────────────────────────────
  await prisma.giftCard.upsert({
    where: { code: "ONESTAR2025" },
    update: {},
    create: {
      code: "ONESTAR2025",
      balance: new Prisma.Decimal("100000.00"),
      isActive: true,
    },
  });

  console.log("✓ GiftCard lista");

  // ── Grilla de Inicio ────────────────────────────────────────────────────────
  const gridCount = await prisma.homeGridBlock.count();
  if (gridCount === 0) {
    await prisma.homeGridBlock.createMany({
      data: [
        { label: "Lanzamientos", href: "/lanzamientos", bgColor: "bg-[#1C1C1C]", emoji: "🚀", darkText: false, position: 0 },
        { label: "Hombre", href: "/hombre", bgColor: "bg-[#2C2C2C]", emoji: "👟", darkText: false, position: 1 },
        { label: "Mujer", href: "/mujer", bgColor: "bg-[#3A3A3A]", emoji: "✨", darkText: false, position: 2 },
        { label: "Niños", href: "/ninos", bgColor: "bg-[#4A4A4A]", emoji: "⭐", darkText: false, position: 3 },
        { label: "Accesorios", href: "/accesorios", bgColor: "bg-[#E0E0E0]", emoji: "🎒", darkText: true, position: 4 },
        { label: "SALE", href: "/sale", bgColor: "bg-[#E31C23]", emoji: "%", darkText: false, position: 5 },
        { label: "Tarjeta\nRegalo", href: "/tarjeta-regalo", bgColor: "bg-[#1C1C1C]", emoji: "🎁", darkText: false, position: 6 },
      ],
    });
    console.log("✓ 7 bloques de inicio creados");
  } else {
    console.log("✓ Bloques de inicio ya existen, omitiendo seed");
  }

  // ── Menú de Navegación ──────────────────────────────────────────────────────
  const navCount = await prisma.navigationItem.count();
  if (navCount === 0) {
    await prisma.navigationItem.createMany({
      data: [
        { label: "Lanzamientos", href: "/lanzamientos", isSale: false, position: 1 },
        { label: "Hombre", href: "/c/hombre", isSale: false, position: 2 },
        { label: "Mujer", href: "/c/mujer", isSale: false, position: 3 },
        { label: "Niños", href: "/c/ninos", isSale: false, position: 4 },
        { label: "SALE", href: "/sale", isSale: true, position: 5 },
        { label: "Accesorios", href: "/c/accesorios", isSale: false, position: 6 },
        { label: "Tarjeta regalo", href: "/tarjeta-regalo", isSale: false, position: 7 },
        { label: "Tiendas", href: "/tiendas", isSale: false, position: 8 },
      ],
    });
    console.log("✓ 8 ítems de navegación creados");
  } else {
    console.log("✓ Navegación ya inicializada");
  }

  // 12. Landing Sections
  const sectionsCount = await prisma.landingSection.count();
  if (sectionsCount === 0) {
    await prisma.landingSection.createMany({
      data: [
        { type: "HERO", position: 1 },
        { type: "CATEGORY_GRID", position: 2 },
        { type: "FEATURED_PRODUCTS", position: 3 },
        { type: "BRAND_STRIP", position: 4 },
        { type: "NEW_ARRIVALS", position: 5 },
        { type: "NEWSLETTER", position: 6 },
      ],
    });
    console.log("✓ 6 secciones de landing creadas");
  } else {
    console.log("✓ Secciones de landing ya inicializadas");
  }

  console.log("Seed completado exitosamente 🚀");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
