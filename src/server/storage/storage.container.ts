import "server-only"
import { IStorageAdapter } from "./ports/storage.port"
import { CloudinaryAdapter } from "./adapters/cloudinary.adapter"

let storageAdapterInstance: IStorageAdapter | null = null

/**
 * Factory para obtener el adaptador de Storage correspondiente.
 * 
 * Por defecto usa Cloudinary, pero si a futuro se añade STORAGE_PROVIDER="firebase"
 * u otro, la lógica de resolución se hará aquí sin afectar el resto de la aplicación.
 */
export function getStorageAdapter(): IStorageAdapter {
  if (storageAdapterInstance) {
    return storageAdapterInstance
  }

  const provider = process.env.STORAGE_PROVIDER || "cloudinary"

  switch (provider.toLowerCase()) {
    case "cloudinary":
      storageAdapterInstance = new CloudinaryAdapter()
      break
    case "firebase":
      // A futuro: storageAdapterInstance = new FirebaseAdapter()
      throw new Error("El adaptador de Firebase Storage aún no está implementado.")
    case "aws":
      // A futuro: storageAdapterInstance = new AwsS3Adapter()
      throw new Error("El adaptador de AWS S3 aún no está implementado.")
    default:
      throw new Error(`Proveedor de storage no soportado: ${provider}`)
  }

  return storageAdapterInstance
}
