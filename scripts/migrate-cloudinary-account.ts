/**
 * Pasa a la cuenta nueva de Cloudinary todos los archivos de la cuenta vieja
 * que la base de datos referencia, y cambia los links.
 *
 * Busca en TODAS las columnas de texto, listas de texto y JSON (productos,
 * tiendas, banners, landings…), así no se escapa ninguna tabla.
 *
 * Uso (con DATABASE_URL y las llaves CLOUDINARY_* de la cuenta NUEVA):
 *   pnpm exec tsx --env-file=.env scripts/migrate-cloudinary-account.ts           # simulación: cuenta, no escribe
 *   pnpm exec tsx --env-file=.env scripts/migrate-cloudinary-account.ts --apply   # copia los archivos y cambia los links
 *
 * Se puede repetir: los archivos ya copiados no se vuelven a subir.
 * Si una copia falla, no cambia ningún link.
 */
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { v2 as cloudinary } from "cloudinary"
import { PrismaClient } from "@prisma/client"

const OLD_CLOUD = process.env.CLOUDINARY_OLD_CLOUD_NAME || "dx3xszzcv"
const CONCURRENCY = 4

export interface CloudinaryAsset {
  resourceType: string
  type: string
  publicId: string
  /** Link del original, sin transformaciones, para copiarlo. */
  originalUrl: string
}

// Parámetros de transformación de Cloudinary: 1 a 3 letras + "_" (f_auto,q_auto,w_384).
const TRANSFORMATION = /^[a-z]{1,3}_[^/,]+(,[a-z]{1,3}_[^/,]+)*$/

/** Separa un link de Cloudinary en tipo, public_id y link del original. */
export function parseCloudinaryUrl(url: string, cloud: string): CloudinaryAsset | null {
  const prefix = `res.cloudinary.com/${cloud}/`
  const start = url.indexOf(prefix)
  if (start === -1) return null
  const [resourceType, type, ...rest] = url.slice(start + prefix.length).split(/[?#]/)[0].split("/")
  if (!resourceType || !type || rest.length === 0) return null

  while (rest.length > 1 && TRANSFORMATION.test(rest[0])) rest.shift()
  const version = /^v\d+$/.test(rest[0]) && rest.length > 1 ? rest.shift() : undefined
  const path = rest.join("/")
  // Las imágenes y videos llevan la extensión fuera del public_id; los "raw" no.
  const publicId = resourceType === "raw" ? path : path.replace(/\.[a-z0-9]+$/i, "")
  if (!publicId) return null

  return {
    resourceType,
    type,
    publicId,
    originalUrl: `https://res.cloudinary.com/${cloud}/${resourceType}/${type}/${version ? `${version}/` : ""}${path}`,
  }
}

/** Links de la cuenta vieja dentro de un texto (columna de texto o JSON). */
export function extractCloudinaryUrls(text: string, cloud: string): string[] {
  const pattern = new RegExp(`https?://res\\.cloudinary\\.com/${cloud}/[^\\s"'<>()\\\\\\]}]+`, "g")
  return (text.match(pattern) ?? []).map((url) => url.replace(/[.,;]+$/, ""))
}

interface TextColumn {
  table: string
  column: string
  /** Tipo para volver a convertir el texto: text, varchar, text[], jsonb… */
  castType: string
}

async function findTextColumns(prisma: PrismaClient): Promise<TextColumn[]> {
  return prisma.$queryRaw<TextColumn[]>`
    SELECT c.table_name AS "table", c.column_name AS "column", format_type(a.atttypid, a.atttypmod) AS "castType"
    FROM information_schema.columns c
    JOIN pg_attribute a ON a.attrelid = format('%I.%I', c.table_schema, c.table_name)::regclass AND a.attname = c.column_name
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = current_schema()
      AND c.table_name <> '_prisma_migrations'
      AND (c.data_type IN ('text', 'character varying', 'json', 'jsonb')
        OR (c.data_type = 'ARRAY' AND c.udt_name IN ('_text', '_varchar')))
  `
}

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`
const oldHost = `res.cloudinary.com/${OLD_CLOUD}/`

async function main(apply: boolean) {
  const newCloud = process.env.CLOUDINARY_CLOUD_NAME
  if (!newCloud || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Faltan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET (cuenta nueva).")
  }
  if (newCloud === OLD_CLOUD) throw new Error(`CLOUDINARY_CLOUD_NAME sigue siendo la cuenta vieja (${OLD_CLOUD}).`)
  cloudinary.config({
    cloud_name: newCloud,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  const prisma = new PrismaClient()
  try {
    // 1. Dónde aparece la cuenta vieja y qué archivos usa.
    const hits: (TextColumn & { rows: number })[] = []
    const urls = new Set<string>()
    for (const col of await findTextColumns(prisma)) {
      const rows = await prisma.$queryRawUnsafe<{ value: string }[]>(
        `SELECT ${quote(col.column)}::text AS value FROM ${quote(col.table)} WHERE ${quote(col.column)}::text LIKE $1`,
        `%${oldHost}%`,
      )
      if (rows.length === 0) continue
      hits.push({ ...col, rows: rows.length })
      for (const { value } of rows) extractCloudinaryUrls(value, OLD_CLOUD).forEach((url) => urls.add(url))
    }

    const assets = new Map<string, CloudinaryAsset>()
    const unreadable: string[] = []
    for (const url of urls) {
      const asset = parseCloudinaryUrl(url, OLD_CLOUD)
      if (!asset) unreadable.push(url)
      else assets.set(`${asset.resourceType}/${asset.type}/${asset.publicId}`, asset)
    }
    // shortcut: solo copia archivos "upload" (los únicos que usa la tienda); si aparece otro tipo, se detiene para revisarlo a mano.
    const otherTypes = [...assets.values()].filter((a) => a.type !== "upload")

    console.log(`Cuenta vieja: ${OLD_CLOUD} → cuenta nueva: ${newCloud}`)
    for (const hit of hits) console.log(`  ${hit.table}.${hit.column}: ${hit.rows} filas`)
    console.log(`Archivos distintos a copiar: ${assets.size}`)
    if (unreadable.length > 0) console.log(`Links que no se pudieron leer (${unreadable.length}):\n  ${unreadable.slice(0, 10).join("\n  ")}`)
    if (otherTypes.length > 0) console.log(`Archivos que no son "upload" (${otherTypes.length}): ${otherTypes.slice(0, 5).map((a) => a.originalUrl).join(", ")}`)

    if (!apply) {
      console.log("\nSimulación: no se copió ni cambió nada. Para hacerlo: --apply")
      return
    }
    if (unreadable.length > 0 || otherTypes.length > 0) {
      throw new Error("Hay links que el script no sabe copiar: revisarlos antes de aplicar. No se cambió nada.")
    }

    // 2. Copiar a la cuenta nueva con el mismo public_id (overwrite: false = repetir no duplica).
    const pending = [...assets.values()]
    const failed: string[] = []
    let done = 0
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let asset = pending.shift(); asset; asset = pending.shift()) {
          try {
            await cloudinary.uploader.upload(asset.originalUrl, {
              public_id: asset.publicId,
              resource_type: asset.resourceType as "image" | "video" | "raw",
              type: "upload",
              overwrite: false,
              asset_folder: asset.publicId.includes("/") ? asset.publicId.slice(0, asset.publicId.lastIndexOf("/")) : undefined,
            })
          } catch (error) {
            failed.push(`${asset.originalUrl}: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
          }
          if (++done % 50 === 0) console.log(`  copiados ${done}/${assets.size}`)
        }
      }),
    )
    if (failed.length > 0) {
      throw new Error(`Fallaron ${failed.length} copias; no se cambió ningún link. Repetir el script:\n  ${failed.slice(0, 20).join("\n  ")}`)
    }
    console.log(`Copiados ${assets.size} archivos.`)

    // 3. Cambiar los links en una sola transacción. Mismo public_id: solo cambia el nombre de la cuenta.
    const updated = await prisma.$transaction(
      hits.map((hit) =>
        prisma.$executeRawUnsafe(
          `UPDATE ${quote(hit.table)} SET ${quote(hit.column)} = replace(${quote(hit.column)}::text, $1, $2)::${hit.castType} WHERE ${quote(hit.column)}::text LIKE $3`,
          oldHost,
          `res.cloudinary.com/${newCloud}/`,
          `%${oldHost}%`,
        ),
      ),
    )
    console.log(`Links cambiados en ${updated.reduce((a, b) => a + b, 0)} filas. Listo.`)
  } finally {
    await prisma.$disconnect()
  }
}

const invokedPath = process.argv[1]
if (invokedPath && import.meta.url === pathToFileURL(resolve(invokedPath)).href) {
  main(process.argv.includes("--apply")).catch((error) => {
    console.error(`✗ ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
