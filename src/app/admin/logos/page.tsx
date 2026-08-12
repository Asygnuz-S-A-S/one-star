import { getAllStoreLogos } from "@/server/repositories/site-logo.repository"
import LogoManager from "@/components/admin/LogoManager"

export const metadata = {
  title: "Admin - Logos | One Star",
}

export default async function AdminLogosPage() {
  const allLogos = await getAllStoreLogos()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Galería de Logos</h1>
      <p className="text-gray-600 mb-8 max-w-3xl">
        Sube los logos de tu marca y define cuál es el principal para cada tipo de pantalla.
        Puedes mantener varias versiones (claro/oscuro) y cambiar entre ellas fácilmente.
      </p>

      <LogoManager initialLogos={allLogos} />
    </div>
  )
}
