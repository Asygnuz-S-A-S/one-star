import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"

// TODO: Make store info dynamic (persist to DB or settings table)

async function saveConfig(_formData: FormData): Promise<void> {
  "use server"
  void _formData
  await requireAdmin()
  // TODO: Persistir en tabla StoreSettings (pendiente de implementar)
  revalidatePath("/admin/configuracion")
}

export default function ConfiguracionPage() {
  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
  const labelClass = "block text-xs font-semibold text-[#4A4A4A] mb-1"

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C] mb-6">
        Configuración
      </h1>

      <form action={saveConfig} className="space-y-8">
        {/* Información de la tienda */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-1">
            Información de la tienda
          </h2>
          <p className="text-xs text-[#4A4A4A] mb-4">
            Datos de contacto que aparecen en emails y footer.{" "}
            {/* TODO: Conectar a tabla de configuración dinámica en DB */}
          </p>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nombre de la tienda</label>
              <input
                type="text"
                name="storeName"
                defaultValue="One Star"
                placeholder="One Star"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email de contacto</label>
              <input
                type="email"
                name="contactEmail"
                defaultValue=""
                placeholder="hola@onestar.co"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>WhatsApp (con código de país)</label>
              <input
                type="tel"
                name="whatsapp"
                defaultValue=""
                placeholder="+573001234567"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-[#E31C23] text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-red-700 transition-colors"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}
