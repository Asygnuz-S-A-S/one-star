"use client"

import Link from "next/link"
import Image from "next/image"
import { useRef, useTransition } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "./DataTable"
import { bulkToggleProductsPublishStatus } from "@/app/admin/productos/actions"
import type { ProductDTO } from "@/server/services/product.service"
import { useToast } from "@/hooks/useToast"
import ToastContainer from "@/components/ui/ToastContainer"
import {
  createSingleFlightRunner,
  getAdminProductStatus,
  getBulkPublishFeedback,
  getProductRowId,
} from "./product-table.model"

const columns: ColumnDef<ProductDTO, unknown>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        className="w-4 h-4 rounded border-gray-300 text-[#E31C23] focus:ring-[#E31C23] cursor-pointer"
        aria-label="Seleccionar todos"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="w-4 h-4 rounded border-gray-300 text-[#E31C23] focus:ring-[#E31C23] cursor-pointer"
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    meta: { width: "40px", align: "center" },
  },
  {
    id: "foto",
    header: "Foto",
    enableSorting: false,
    meta: { width: "64px" },
    cell: ({ row }) => {
      const img = row.original.images[0]
      if (!img) {
        return (
          <Link
            href={`/admin/productos/${row.original.id}`}
            className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50 px-1 text-center text-[10px] font-semibold leading-tight text-amber-800 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
            aria-label={`Agregar imagen a ${row.original.name}`}
          >
            Sin imagen
          </Link>
        )
      }
      return (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          <Image
            src={img.url}
            alt={img.alt ?? row.original.name}
            width={48}
            height={48}
            className={`w-full h-full object-contain`}
          />
        </div>
      )
    },
  },
  {
    id: "nombre",
    header: "Nombre",
    accessorKey: "name",
    cell: ({ row }) => (
      <div>
        <span className="font-medium text-[#1C1C1C]">{row.original.name}</span>
        <br />
        <span className="text-xs text-[#4A4A4A]">{row.original.slug}</span>
      </div>
    ),
  },
  {
    id: "marca",
    header: "Marca",
    accessorKey: "brandName",
    cell: ({ row }) => (
      <span className="text-[#4A4A4A]">{row.original.brandName ?? "—"}</span>
    ),
  },
  {
    id: "categoria",
    header: "Categoría web",
    accessorFn: (row) => row.category.name,
    cell: ({ row }) => (
      <span className="text-[#4A4A4A]">{row.original.category.name}</span>
    ),
  },
  {
    id: "origen",
    header: "Origen",
    accessorFn: (row) => (row.erpId ? "ERP" : "Manual"),
    cell: ({ row }) => {
      const isErp = Boolean(row.original.erpId)
      return (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isErp ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700"
          }`}
          title={isErp ? `Sincronizado desde el ERP (erpId: ${row.original.erpId})` : "Cargado manualmente (admin o Excel)"}
        >
          {isErp ? "ERP" : "Manual"}
        </span>
      )
    },
  },
  {
    id: "precio",
    header: "Precio",
    accessorKey: "basePrice",
    cell: ({ row }) => {
      const { basePrice, isOnSale, salePrice } = row.original
      return isOnSale && salePrice ? (
        <div>
          <span className="text-[#E31C23] font-semibold">
            ${salePrice.toLocaleString("es-CO")}
          </span>
          <span className="text-xs line-through text-gray-400 ml-1">
            ${basePrice.toLocaleString("es-CO")}
          </span>
        </div>
      ) : (
        <span className="font-semibold text-[#1C1C1C]">
          ${basePrice.toLocaleString("es-CO")}
        </span>
      )
    },
  },
  {
    id: "stock",
    header: "Stock",
    accessorFn: (row) => row.variants.reduce((s, v) => s + v.stock, 0),
    cell: ({ row }) => {
      const total = row.original.variants.reduce((s, v) => s + v.stock, 0)
      return (
        <span className={`font-medium ${total === 0 ? "text-red-500" : "text-[#1C1C1C]"}`}>
          {total}
        </span>
      )
    },
  },
  {
    id: "estado",
    header: "Estado",
    accessorFn: (row) => {
      const { label } = getAdminProductStatus(row)
      return label
    },
    cell: ({ row }) => {
      const status = getAdminProductStatus(row.original)
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
          {status.label}
        </span>
      )
    },
  },
  {
    id: "acciones",
    header: "Acciones",
    enableSorting: false,
    meta: { align: "right" },
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/admin/productos/${row.original.id}`}
          className="inline-flex min-h-11 items-center text-xs font-medium text-[#E31C23] hover:underline"
        >
          Editar
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href={`/productos/${row.original.slug}`}
          target="_blank"
          className="inline-flex min-h-11 items-center text-xs font-medium text-[#4A4A4A] hover:underline"
        >
          Ver en tienda
        </Link>
      </div>
    ),
  },
]

interface ProductosTableProps {
  products: ProductDTO[]
  total: number
  page: number
  totalPages: number
  prevHref?: string
  nextHref?: string
  emptyMessage?: string
}

export function ProductosTable({
  products,
  total,
  page,
  totalPages,
  prevHref,
  nextHref,
  emptyMessage = "Aún no hay productos.",
}: ProductosTableProps) {
  const [isPending, startTransition] = useTransition()
  const updateRunner = useRef(createSingleFlightRunner())
  const { toasts, showToast, dismissToast } = useToast()

  function updatePublishStatus(
    selectedRows: ProductDTO[],
    isPublished: boolean,
    clearSelection: () => void
  ) {
    startTransition(async () => {
      await updateRunner.current.run(async () => {
        try {
          const result = await bulkToggleProductsPublishStatus(
            selectedRows.map((row) => row.id),
            isPublished
          )
          const feedback = getBulkPublishFeedback(result, isPublished)
          showToast(feedback.message, feedback.type)
          if (feedback.clearSelection) clearSelection()
        } catch {
          showToast("No se pudieron actualizar los productos.", "error")
        }
      })
    })
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-[#4A4A4A] text-lg mb-4">{emptyMessage}</p>
          <Link
            href="/admin/integraciones"
            className="inline-block bg-[#E31C23] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Sincronizar desde Loggro
          </Link>
        </div>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {products.map((product) => {
            const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0)
            const image = product.images[0]
            const price = product.isOnSale && product.salePrice ? product.salePrice : product.basePrice
            return (
              <article key={product.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {image && (
                      <Image src={image.url} alt={image.alt ?? product.name} width={64} height={64} className="h-full w-full object-contain" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-medium text-[#1C1C1C]">{product.name}</h2>
                    <p className="text-sm text-[#4A4A4A]">{product.brandName ?? "Sin marca"} · {product.category.name}</p>
                    <p className="mt-1 text-sm font-semibold">${price.toLocaleString("es-CO")} · stock {stock}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href={`/admin/productos/${product.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#E31C23] text-sm font-semibold text-white">Editar</Link>
                  <Link href={`/productos/${product.slug}`} target="_blank" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-200 text-sm font-semibold text-[#1C1C1C]">Ver en tienda</Link>
                </div>
              </article>
            )
          })}
          <div className="flex gap-2">
            {prevHref && <Link href={prevHref} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm">Anterior</Link>}
            {nextHref && <Link href={nextHref} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm">Siguiente</Link>}
          </div>
        </div>
        <div className="hidden md:block">
        <DataTable
          key={`${page}:${products.map((product) => product.id).join(":")}`}
          data={products}
          columns={columns}
          getRowId={getProductRowId}
          pagination={{ page, totalPages, totalCount: total, unit: "productos", prevHref, nextHref }}
          emptyMessage={emptyMessage}
          toolbar={(selectedRows, clearSelection) => (
            <div className="flex items-center gap-4 bg-[#F9FAFB] border border-gray-200 p-3 rounded-xl">
              <span className="text-sm font-semibold text-[#1C1C1C]">
                {selectedRows.length} producto{selectedRows.length !== 1 && "s"} seleccionado{selectedRows.length !== 1 && "s"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updatePublishStatus(selectedRows, true, clearSelection)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-[#1C1C1C] hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Procesando..." : "Activar"}
                </button>
                <button
                  type="button"
                  onClick={() => updatePublishStatus(selectedRows, false, clearSelection)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#E31C23] border border-[#E31C23] rounded-lg text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Procesando..." : "Desactivar"}
                </button>
              </div>
            </div>
          )}
        />
        </div>
        </>
      )}
    </>
  )
}
