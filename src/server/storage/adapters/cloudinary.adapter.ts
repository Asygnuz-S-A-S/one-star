import "server-only"
import { v2 as cloudinary } from "cloudinary"
import { IStorageAdapter, UploadOptions, UploadResult } from "../ports/storage.port"

export class CloudinaryAdapter implements IStorageAdapter {
  constructor() {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error(
        "Cloudinary no está configurado. Faltan variables de entorno (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)."
      )
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
  }

  async uploadImage(base64: string, options?: UploadOptions): Promise<UploadResult> {
    const result = await cloudinary.uploader.upload(base64, {
      folder: options?.folder || "one-star/productos",
      resource_type: "auto",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    })

    return {
      url: result.secure_url,
      publicId: result.public_id,
    }
  }
}
