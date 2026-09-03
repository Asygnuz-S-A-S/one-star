import "server-only"

export interface UploadOptions {
  folder?: string
}

export interface UploadResult {
  url: string
  publicId?: string
}

export interface IStorageAdapter {
  /**
   * Sube una imagen al proveedor de almacenamiento.
   * @param base64 String base64 de la imagen (ej: "data:image/jpeg;base64,...")
   * @param options Opciones de subida como la carpeta de destino
   */
  uploadImage(base64: string, options?: UploadOptions): Promise<UploadResult>
}
