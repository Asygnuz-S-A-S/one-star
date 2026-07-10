import { NextRequest, NextResponse } from "next/server"
import { getStorageAdapter } from "@/server/storage/storage.container"

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({ url: result.url, publicId: result.publicId })
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[api/upload]", error)
    }
    
    // Si el error es de configuración, devolver un 503
    if (error.message?.includes("configurado")) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 })
  }
}
