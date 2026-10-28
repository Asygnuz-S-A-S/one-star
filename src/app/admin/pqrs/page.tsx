import type { Metadata } from "next"
import { requireAdmin } from "@/server/auth/require-admin"
import { listPqrsRequests } from "@/server/services/pqrs.service"
import PqrsAdminTable from "@/components/admin/PqrsAdminTable"

export const metadata: Metadata = {
  title: "PQRS (Habeas Data) | Admin One Star",
  description: "Bandeja de gestión y control de plazos legales para solicitudes de Habeas Data.",
}

export default async function AdminPqrsPage() {
  await requireAdmin()
  const { items } = await listPqrsRequests({ take: 100 })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-barlow text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-[#1C1C1C]">
            Canal de Derechos (PQRS y Habeas Data)
          </h1>
          <p className="mt-1 font-montserrat text-sm text-[#4A4A4A]">
            Control de términos legales: Consultas (10 días hábiles) y Reclamos/Supresión (15 días hábiles).
          </p>
        </div>
      </div>

      <PqrsAdminTable initialItems={items} />
    </div>
  )
}
