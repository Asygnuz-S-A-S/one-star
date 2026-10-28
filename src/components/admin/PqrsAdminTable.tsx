"use client"

import { useState } from "react"
import { calculateBusinessDaysRemaining } from "@/lib/business-days"
import { updatePqrsStatusAction } from "@/app/admin/pqrs/actions"
import type { PqrsRequest, PqrsStatus } from "@prisma/client"

interface PqrsAdminTableProps {
  initialItems: PqrsRequest[]
}

const TYPE_LABELS: Record<string, string> = {
  CONSULTA: "Consulta (10 días)",
  RECLAMO: "Reclamo (15 días)",
  SUPRESION: "Supresión (15 días)",
  RETIRO_PUBLICIDAD: "Baja Publicidad (15 días)",
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  PENDIENTE: { label: "Pendiente", class: "bg-amber-100 text-amber-800 border-amber-200" },
  EN_TRAMITE: { label: "En trámite", class: "bg-blue-100 text-blue-800 border-blue-200" },
  RESUELTO: { label: "Resuelto", class: "bg-green-100 text-green-800 border-green-200" },
}

export default function PqrsAdminTable({ initialItems }: PqrsAdminTableProps) {
  const [items, setItems] = useState<PqrsRequest[]>(initialItems)
  const [selectedItem, setSelectedItem] = useState<PqrsRequest | null>(null)
  const [editStatus, setEditStatus] = useState<PqrsStatus>("PENDIENTE")
  const [responseNotes, setResponseNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleOpenDetail = (item: PqrsRequest) => {
    setSelectedItem(item)
    setEditStatus(item.status)
    setResponseNotes(item.responseNotes ?? "")
    setActionError(null)
  }

  const handleSaveStatus = async () => {
    if (!selectedItem) return
    setSaving(true)
    setActionError(null)

    const res = await updatePqrsStatusAction(selectedItem.id, editStatus, responseNotes)
    setSaving(false)

    if (res.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id
            ? { ...i, status: editStatus, responseNotes: responseNotes || null, respondedAt: editStatus === "RESUELTO" ? new Date() : i.respondedAt }
            : i
        )
      )
      setSelectedItem(null)
    } else {
      setActionError(res.error ?? "No se pudo actualizar.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-[#E0E0E0] bg-white shadow-sm">
        <table className="w-full text-left font-montserrat text-xs">
          <thead className="bg-[#F9F9F9] border-b border-[#E0E0E0] text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A]">
            <tr>
              <th className="py-3 px-4">Radicado</th>
              <th className="py-3 px-4">Titular</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Fecha Radicado</th>
              <th className="py-3 px-4">Plazo Legal Restante</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E0E0]">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  No hay solicitudes de PQRS radicadas.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const term = calculateBusinessDaysRemaining(item.createdAt, item.type)
                const isResolved = item.status === "RESUELTO"

                let badgeClass = "bg-green-100 text-green-800 border-green-200"
                if (isResolved) {
                  badgeClass = "bg-gray-100 text-gray-700 border-gray-200"
                } else if (term.isOverdue) {
                  badgeClass = "bg-red-100 text-red-800 border-red-200 font-bold"
                } else if (term.remainingDays <= 3) {
                  badgeClass = "bg-amber-100 text-amber-800 border-amber-200 font-semibold"
                }

                return (
                  <tr key={item.id} className="hover:bg-[#F9F9F9]/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1C1C1C]">
                      {item.ticketNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#1C1C1C]">{item.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {item.documentType} {item.documentNumber} · {item.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-[#1C1C1C]">
                        {TYPE_LABELS[item.type] ?? item.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {new Intl.DateTimeFormat("es-CO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(item.createdAt))}
                    </td>
                    <td className="py-3.5 px-4">
                      {isResolved ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-gray-100 text-gray-600 border-gray-200">
                          Resuelto
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${badgeClass}`}>
                          {term.label}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_LABELS[item.status]?.class}`}>
                        {STATUS_LABELS[item.status]?.label ?? item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(item)}
                        className="px-3 py-1.5 rounded border border-[#E0E0E0] hover:border-[#1C1C1C] font-semibold text-[11px] uppercase tracking-wider text-[#1C1C1C] transition-colors"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalle y Gestión */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#E0E0E0] pb-3">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-[#E31C23] font-bold">
                  Gestión de Habeas Data
                </span>
                <h3 className="font-barlow font-bold text-xl text-[#1C1C1C]">
                  Radicado: {selectedItem.ticketNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#F9F9F9] p-4 rounded-lg">
              <div>
                <span className="font-semibold text-gray-500 block">Titular:</span>
                <span className="text-[#1C1C1C]">{selectedItem.name}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500 block">Documento:</span>
                <span className="text-[#1C1C1C]">{selectedItem.documentType} {selectedItem.documentNumber}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500 block">Correo:</span>
                <span className="text-[#1C1C1C]">{selectedItem.email}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500 block">Teléfono:</span>
                <span className="text-[#1C1C1C]">{selectedItem.phone || "No registrado"}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500 block">Tipo:</span>
                <span className="text-[#1C1C1C] font-semibold">{TYPE_LABELS[selectedItem.type]}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500 block">Plazo Legal:</span>
                <span className="text-[#1C1C1C] font-semibold">
                  {calculateBusinessDaysRemaining(selectedItem.createdAt, selectedItem.type).label}
                </span>
              </div>
            </div>

            <div>
              <span className="font-montserrat font-semibold text-xs text-[#1C1C1C] block mb-1">
                Descripción de la petición del titular:
              </span>
              <p className="text-xs font-montserrat text-[#4A4A4A] bg-gray-50 p-3 rounded-lg border border-gray-200 whitespace-pre-wrap">
                {selectedItem.description}
              </p>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#E0E0E0]">
              <div>
                <label className="font-montserrat font-semibold text-xs text-[#1C1C1C] block mb-1">
                  Estado del trámite
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as PqrsStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E0E0E0] text-xs font-montserrat focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN_TRAMITE">EN TRÁMITE</option>
                  <option value="RESUELTO">RESUELTO</option>
                </select>
              </div>

              <div>
                <label className="font-montserrat font-semibold text-xs text-[#1C1C1C] block mb-1">
                  Notas de respuesta / Actuaciones administrativas
                </label>
                <textarea
                  rows={3}
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Detalla las actuaciones realizadas, respuesta enviada al titular o motivos de resolución..."
                  className="w-full p-3 rounded-lg border border-[#E0E0E0] text-xs font-montserrat focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
                />
              </div>

              {actionError && (
                <p className="text-xs text-[#E31C23] font-montserrat">{actionError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-lg border border-[#E0E0E0] text-xs font-montserrat font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveStatus}
                className="px-5 py-2 rounded-lg bg-[#E31C23] text-white text-xs font-montserrat font-bold uppercase tracking-wider hover:bg-[#c9181e] disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
