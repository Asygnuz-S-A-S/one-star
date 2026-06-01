import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // ── Categorías ─────────────────────────────────────────────────────────────
  const [lanzamientos, hombre, , , accesorios] = await Promise.all([
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
      slug: "asphalt-hoodie",
      name: "Asphalt Hoodie",
      basePrice: new Prisma.Decimal("249900.00"),
      isOnSale: true,
      salePrice: new Prisma.Decimal("199900.00"),
      description:
        "Sudadera urbana de alto rendimiento. Tejido técnico antipilling con capucha ajustable y bolsillo canguro. Corte oversize inspirado en el asfalto de la ciudad.",
      categoryId: lanzamientos.id,
      images: [
        { url: "/images/asphalt-hoodie-1.jpg", alt: "Asphalt Hoodie vista frontal", position: 0 },
        { url: "/images/asphalt-hoodie-2.jpg", alt: "Asphalt Hoodie vista trasera", position: 1 },
        { url: "/images/asphalt-hoodie-3.jpg", alt: "Asphalt Hoodie detalle capucha", position: 2 },
      ],
      variants: [
        { sku: "AH-S-GRY",  size: "S",  color: "Gris Concreto", stock: 10 },
        { sku: "AH-M-GRY",  size: "M",  color: "Gris Concreto", stock: 15 },
        { sku: "AH-L-GRY",  size: "L",  color: "Gris Concreto", stock: 8  },
        { sku: "AH-S-BLK",  size: "S",  color: "Negro Carbono", stock: 12 },
        { sku: "AH-M-BLK",  size: "M",  color: "Negro Carbono", stock: 20 },
        { sku: "AH-L-BLK",  size: "L",  color: "Negro Carbono", stock: 5  },
      ],
    },
    {
      slug: "carbon-run-tee",
      name: "Carbon Run Tee",
      basePrice: new Prisma.Decimal("89900.00"),
      isOnSale: false,
      salePrice: null,
      description:
        "Camiseta técnica de running con tejido de secado ultra-rápido. Costuras planas para evitar fricciones. Diseñada para el corredor urbano que no sacrifica el estilo.",
      categoryId: hombre.id,
      images: [
        { url: "/images/carbon-run-tee-1.jpg", alt: "Carbon Run Tee vista frontal", position: 0 },
        { url: "/images/carbon-run-tee-2.jpg", alt: "Carbon Run Tee detalle tejido", position: 1 },
      ],
      variants: [
        { sku: "CRT-S-BLK",  size: "S",  color: "Negro Carbono", stock: 20 },
        { sku: "CRT-M-BLK",  size: "M",  color: "Negro Carbono", stock: 25 },
        { sku: "CRT-L-BLK",  size: "L",  color: "Negro Carbono", stock: 18 },
        { sku: "CRT-XL-BLK", size: "XL", color: "Negro Carbono", stock: 10 },
        { sku: "CRT-M-WHT",  size: "M",  color: "Blanco",        stock: 14 },
        { sku: "CRT-L-WHT",  size: "L",  color: "Blanco",        stock: 9  },
      ],
    },
    {
      slug: "concrete-jogger",
      name: "Concrete Jogger",
      basePrice: new Prisma.Decimal("179900.00"),
      isOnSale: false,
      salePrice: null,
      description:
        "Jogger urbano de corte relaxed fit con bolsillos laterales de cremallera y puños acanalados. El gris concreto como filosofía de vida.",
      categoryId: hombre.id,
      images: [
        { url: "/images/concrete-jogger-1.jpg", alt: "Concrete Jogger vista frontal", position: 0 },
        { url: "/images/concrete-jogger-2.jpg", alt: "Concrete Jogger vista lateral", position: 1 },
      ],
      variants: [
        { sku: "CJ-S-GRY",  size: "S",  color: "Gris Concreto", stock: 8  },
        { sku: "CJ-M-GRY",  size: "M",  color: "Gris Concreto", stock: 14 },
        { sku: "CJ-L-GRY",  size: "L",  color: "Gris Concreto", stock: 11 },
        { sku: "CJ-XL-GRY", size: "XL", color: "Gris Concreto", stock: 6  },
        { sku: "CJ-M-BLK",  size: "M",  color: "Negro Carbono", stock: 9  },
        { sku: "CJ-L-BLK",  size: "L",  color: "Negro Carbono", stock: 7  },
      ],
    },
    {
      slug: "one-star-logo-cap",
      name: "One Star Logo Cap",
      basePrice: new Prisma.Decimal("59900.00"),
      isOnSale: false,
      salePrice: null,
      description:
        "Gorra 6 paneles con estructura media y visera curva. Bordado del isotipo One Star en frente. Cierre ajustable de metal. Talla única.",
      categoryId: accesorios.id,
      images: [
        { url: "/images/one-star-logo-cap-1.jpg", alt: "One Star Logo Cap vista frontal", position: 0 },
        { url: "/images/one-star-logo-cap-2.jpg", alt: "One Star Logo Cap vista lateral", position: 1 },
      ],
      variants: [
        { sku: "OSC-ONE-BLK", size: "Única", color: "Negro Carbono",  stock: 30 },
        { sku: "OSC-ONE-WHT", size: "Única", color: "Blanco",         stock: 25 },
        { sku: "OSC-ONE-RED", size: "Única", color: "Rojo One Star",  stock: 15 },
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
  console.log("\nSeed completado: 5 categorías · 4 productos · variantes · 1 gift card");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
