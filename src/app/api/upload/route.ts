import { NextRequest, NextResponse } from "next/server"
import { getStorageAdapter } from "@/server/storage/storage.container"
import { getAdminSession } from "@/server/auth/require-admin"

export async function POST(request: NextRequest) {
  try {
    // Solo administradores pueden subir archivos: evita abuso de la cuenta de
    // almacenamiento (costos, alojamiento de contenido arbitrario).
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const storage = getStorageAdapter()

    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 })
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen o un video" }, { status: 400 })
    }

    const MAX_SIZE = 30 * 1024 * 1024 // 30 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo no puede superar los 30 MB" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`

    const result = await storage.uploadImage(base64, { folder: "one-star/productos" })

    // Registrar en MediaAsset para biblioteca centralizada
    const fileType = file.type.startsWith("video/") ? "video" : "image"
    try {
      const { createMediaAsset } = await import("@/server/services/media-asset.service")
      await createMediaAsset({
        url: result.url,
        publicId: result.publicId,
        fileName: file.name || (fileType === "video" ? "video.mp4" : "imagen.jpg"),
        fileType,
        mimeType: file.type,
        fileSize: file.size,
        folder: "productos",
      })
    } catch (saveErr) {
      console.warn("[api/upload] No se pudo registrar en MediaAsset:", saveErr)
    }

    return NextResponse.json({ url: result.url, publicId: result.publicId })
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[api/upload]", error)
    }
    
    // Si el error es de configuración, devolver un 503
    const message = error instanceof Error ? error.message : ""
    if (message.includes("configurado")) {
      return NextResponse.json(
        { error: message },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 })
  }
}
