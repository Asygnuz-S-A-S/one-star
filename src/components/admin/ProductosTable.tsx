"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useTransition } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "./DataTable"
import { bulkToggleProductsPublishStatus } from "@/app/admin/productos/actions"
import type { ProductDTO } from "@/server/services/product.service"
import { PLACEHOLDER_IMAGE_URL } from "@/lib/product-image"

function getProductStatus(variants: { stock: number }[], isOnSale: boolean) {
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0)
  if (totalStock === 0) return { label: "AGOTADO", color: "bg-gray-100 text-gray-600" }
  if (isOnSale) return { label: "SALE", color: "bg-red-100 text-[#E31C23]" }
  return { label: "ACTIVO", color: "bg-green-100 text-green-700" }
}

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
      return (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          <Image
            src={img?.url ?? PLACEHOLDER_IMAGE_URL}
            alt={img?.alt ?? `${row.original.name} — sin foto`}
            width={48}
            height={48}
            className={`w-full h-full ${img ? "object-cover" : "object-contain"}`}
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
    header: "Categoría",
    accessorFn: (row) => row.category.name,
    cell: ({ row }) => (
      <span className="text-[#4A4A4A]">{row.original.category.name}</span>
    ),
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
      const { label } = getProductStatus(row.variants, row.isOnSale)
      return label
    },
    cell: ({ row }) => {
      const status = getProductStatus(row.original.variants, row.original.isOnSale)
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
          className="text-xs font-medium text-[#E31C23] hover:underline"
        >
          Editar
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href={`/productos/${row.original.slug}`}
          target="_blank"
          className="text-xs font-medium text-[#4A4A4A] hover:underline"
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
}

export function ProductosTable({
  products,
  total,
  page,
  totalPages,
  prevHref,
  nextHref,
}: ProductosTableProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <DataTable
      data={products}
      columns={columns}
      pagination={{ page, totalPages, totalCount: total, unit: "productos", prevHref, nextHref }}
      emptyMessage="Aún no hay productos."
      toolbar={(selectedRows, clearSelection) => (
        <div className="flex items-center gap-4 bg-[#F9FAFB] border border-gray-200 p-3 rounded-xl mb-4">
          <span className="text-sm font-semibold text-[#1C1C1C]">
            {selectedRows.length} producto{selectedRows.length !== 1 && 's'} seleccionado{selectedRows.length !== 1 && 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                startTransition(async () => {
                  await bulkToggleProductsPublishStatus(selectedRows.map(r => r.id), true)
                  clearSelection()
                })
              }}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-[#1C1C1C] hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {isPending ? "Procesando..." : "Activar"}
            </button>
            <button
              onClick={() => {
                startTransition(async () => {
                  await bulkToggleProductsPublishStatus(selectedRows.map(r => r.id), false)
                  clearSelection()
                })
              }}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-semibold bg-[#E31C23] border border-[#E31C23] rounded-lg text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Procesando..." : "Desactivar"}
            </button>
          </div>
        </div>
      )}
    />
  )
}
