import "dotenv/config"
import fs from "fs"
import path from "path"
import { v2 as cloudinary } from "cloudinary"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

interface PhotoFolder {
  brandDir: string
  folderName: string
  folderPath: string
  files: string[]
}

async function findLocalPhotoFolders(baseDir: string): Promise<PhotoFolder[]> {
  const result: PhotoFolder[] = []
  if (!fs.existsSync(baseDir)) {
    throw new Error(`No se encontró la carpeta base: ${baseDir}`)
  }

  const brands = fs
    .readdirSync(baseDir)
    .filter((f) => !f.startsWith(".") && fs.statSync(path.join(baseDir, f)).isDirectory())

  for (const brand of brands) {
    const brandPath = path.join(baseDir, brand)
    const productFolders = fs
      .readdirSync(brandPath)
      .filter((f) => !f.startsWith(".") && fs.statSync(path.join(brandPath, f)).isDirectory())

    for (const folder of productFolders) {
      const folderPath = path.join(brandPath, folder)
      const files = fs
        .readdirSync(folderPath)
        .filter((file) => {
          if (file.startsWith(".")) return false
          const ext = path.extname(file).toLowerCase()
          return [".jpg", ".jpeg", ".png", ".webp"].includes(ext)
        })
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

      if (files.length > 0) {
        result.push({
          brandDir: brand,
          folderName: folder,
          folderPath,
          files,
        })
      }
    }
  }

  return result
}

// Concurrencia controlada para subidas a Cloudinary
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let currentIndex = 0

  const workers = Array.from({ length: concurrency }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++
      results[idx] = await fn(items[idx], idx)
    }
  })

  await Promise.all(workers)
  return results
}

async function main() {
  console.log("==================================================")
  console.log("   ONE STAR - SINCRONIZACIÓN DE FOTOS DE PRODUCTO ")
  console.log("==================================================\n")

  const baseDir = "FOTOS PRODUCTO"
  console.log(`Buscando carpetas de fotos en "${baseDir}"...`)
  const photoFolders = await findLocalPhotoFolders(baseDir)
  const totalLocalPhotos = photoFolders.reduce((sum, f) => sum + f.files.length, 0)
  console.log(`✓ Se encontraron ${photoFolders.length} carpetas de producto con un total de ${totalLocalPhotos} imágenes.\n`)

  console.log("Cargando productos desde la base de datos...")
  const dbProducts = await prisma.product.findMany({
    include: {
      variants: { select: { id: true, sku: true, stock: true } },
      brand: { select: { id: true, name: true } },
      images: { select: { id: true, url: true } },
    },
  })
  console.log(`✓ Se cargaron ${dbProducts.length} productos de la base de datos.\n`)

  let matchedFolders = 0
  let unmatchedFolders = 0
  let uploadedPhotos = 0
  let updatedProducts = 0

  const unmatchedList: { brand: string; folder: string; count: number }[] = []

  for (let i = 0; i < photoFolders.length; i++) {
    const pf = photoFolders[i]
    const cleanFolderName = pf.folderName.trim()
    const folderLower = cleanFolderName.toLowerCase()

    // Búsqueda inteligente del producto en la base de datos
    const searchTerms = [folderLower]
    if (folderLower === "123173c") searchTerms.push("132173c") // Corrección typo de folder en Converse

    const matchedProduct = dbProducts.find((p) => {
      return searchTerms.some((term) => {
        const matchSku = p.variants.some((v) => v.sku.toLowerCase().includes(term))
        const matchSlug = p.slug.toLowerCase().includes(term)
        const matchName = p.name.toLowerCase().includes(term)
        return matchSku || matchSlug || matchName
      })
    })

    if (!matchedProduct) {
      unmatchedFolders++
      unmatchedList.push({ brand: pf.brandDir, folder: cleanFolderName, count: pf.files.length })
      console.log(`[!] No se encontró producto en BD para la carpeta [${pf.brandDir}] "${cleanFolderName}" (${pf.files.length} fotos).`)
      continue
    }

    matchedFolders++
    console.log(`\n[${matchedFolders}/${photoFolders.length}] Vinculando [${pf.brandDir}] "${cleanFolderName}" -> "${matchedProduct.name}" (ID: ${matchedProduct.id})`)
    console.log(`   Subiendo ${pf.files.length} imágenes a Cloudinary...`)

    // Subir fotos en concurrencia (hasta 4 paralelas por producto)
    const uploadedImages = await runWithConcurrency(
      pf.files,
      4,
      async (fileName, fileIdx) => {
        const filePath = path.join(pf.folderPath, fileName)
        const publicId = `${cleanFolderName.replace(/[^a-zA-Z0-9_-]/g, "_")}_${fileIdx + 1}`

        try {
          const uploadRes = await cloudinary.uploader.upload(filePath, {
            folder: "one-star/productos",
            public_id: publicId,
            overwrite: true,
            resource_type: "image",
            transformation: [{ quality: "auto", fetch_format: "auto" }],
          })

          return {
            url: uploadRes.secure_url,
            alt: `${matchedProduct.name} - Vista ${fileIdx + 1}`,
            position: fileIdx,
            productId: matchedProduct.id,
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`   ✗ Error al subir "${fileName}": ${msg}`)
          return null
        }
      }
    )

    const validImages = uploadedImages.filter((img): img is NonNullable<typeof img> => img !== null)

    if (validImages.length > 0) {
      // Reemplazar imágenes en la BD de forma atómica para este producto
      await prisma.$transaction([
        prisma.productImage.deleteMany({
          where: { productId: matchedProduct.id },
        }),
        prisma.productImage.createMany({
          data: validImages,
        }),
        prisma.product.update({
          where: { id: matchedProduct.id },
          data: {
            isPublished: true, // Asegurar que sea visible si ahora tiene fotos
            updatedAt: new Date(),
          },
        }),
      ])

      uploadedPhotos += validImages.length
      updatedProducts++
      console.log(`   ✓ ${validImages.length} fotos vinculadas exitosamente en la base de datos.`)
    }
  }

  console.log("\n==================================================")
  console.log("            RESUMEN DE SINCRONIZACIÓN             ")
  console.log("==================================================")
  console.log(`Carpetas procesadas con éxito:  ${matchedFolders} / ${photoFolders.length}`)
  console.log(`Productos actualizados en BD:    ${updatedProducts}`)
  console.log(`Fotos subidas y vinculadas:     ${uploadedPhotos} / ${totalLocalPhotos}`)
  if (unmatchedFolders > 0) {
    console.log(`Carpetas no emparejadas:        ${unmatchedFolders}`)
    console.log("Detalle:", JSON.stringify(unmatchedList, null, 2))
  }
  console.log("==================================================\n")
}

main()
  .catch((err) => {
    console.error("Error fatal en el proceso:", err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
