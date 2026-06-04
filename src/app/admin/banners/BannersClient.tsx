"use client"

import { useState, useTransition } from "react"
import BannerForm from "./BannerForm"
import { deleteBanner, toggleBannerActive } from "./actions"
import { formatDateShort } from "@/lib/dates"

interface BannerRow {
  id: string
  title: string
  imageUrl: string
  linkUrl: string | null
  position: number
  isActive: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
}

interface Props {
  banners: BannerRow[]
}

export default function BannersClient({ banners }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BannerRow | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este banner?")) return
    startTransition(async () => {
      await deleteBanner(id)
    })
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleBannerActive(id, current)
    })
  }

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(banner: BannerRow) {
    setEditing(banner)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Banners
          <span className="ml-2 text-sm font-normal text-[#4A4A4A]">({banners.length})</span>
        </h1>
        <button
          onClick={openNew}
          className="bg-[#E31C23] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          + Nuevo banner
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-5">
              {editing ? "Editar banner" : "Nuevo banner"}
            </h2>
            <BannerForm
              initial={editing ?? undefined}
              onClose={closeForm}
            />
          </div>
        </div>
      )}

      {banners.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-[#4A4A4A] text-lg mb-4">No hay banners creados.</p>
          <button
            onClick={openNew}
            className="inline-block bg-[#E31C23] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Crear primer banner
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Preview</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Título</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Link</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Posición</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Estado</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Fechas</th>
                  <th className="text-right px-4 py-3 text-[#4A4A4A] font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="w-20 h-11 rounded overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none"
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1C1C1C] max-w-[160px] truncate">
                      {banner.title}
                    </td>
                    <td className="px-4 py-3 text-[#4A4A4A] max-w-[140px] truncate">
                      {banner.linkUrl ? (
                        <a
                          href={banner.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#E31C23] hover:underline text-xs"
                        >
                          {banner.linkUrl}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#4A4A4A]">{banner.position}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(banner.id, banner.isActive)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                          banner.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {banner.isActive ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#4A4A4A]">
                      {banner.startDate ? formatDateShort(banner.startDate) : "—"}{" "}
                      →{" "}
                      {banner.endDate ? formatDateShort(banner.endDate) : "∞"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEdit(banner)}
                          className="text-xs font-medium text-[#E31C23] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          disabled={isPending}
                          className="text-xs font-medium text-gray-400 hover:text-red-600 hover:underline disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
