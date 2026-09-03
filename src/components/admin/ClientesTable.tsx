"use client"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "./DataTable"
import type { CustomerListDTO } from "@/server/services/user.service"
import { formatDate, formatCurrency } from "@/lib/dates"

const columns: ColumnDef<CustomerListDTO, unknown>[] = [
  {
    id: "cliente",
    header: "Cliente",
    accessorFn: (row) => row.email.split("@")[0],
    cell: ({ row }) => {
      const initial = row.original.email.charAt(0).toUpperCase()
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E31C23]/10 flex items-center justify-center text-[#E31C23] font-bold text-sm shrink-0">
            {initial}
          </div>
          <span className="font-medium text-[#1C1C1C]">
            {row.original.email.split("@")[0]}
          </span>
        </div>
      )
    },
  },
  {
    id: "email",
    header: "Email",
    accessorKey: "email",
    cell: ({ row }) => (
      <span className="text-[#4A4A4A]">{row.original.email}</span>
    ),
  },
  {
    id: "pedidos",
    header: "Pedidos",
    accessorKey: "orderCount",
    cell: ({ row }) => (
      <span className="text-[#4A4A4A]">{row.original.orderCount}</span>
    ),
  },
  {
    id: "ltv",
    header: "LTV",
    accessorKey: "ltv",
    cell: ({ row }) => (
      <span className="font-semibold text-[#1C1C1C]">
        {formatCurrency(row.original.ltv)}
      </span>
    ),
  },
  {
    id: "registro",
    header: "Registro",
    accessorKey: "createdAt",
    cell: ({ row }) => (
      <span className="text-[#4A4A4A] whitespace-nowrap">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "acciones",
    header: "Acciones",
    enableSorting: false,
    meta: { align: "right" },
    cell: ({ row }) => (
      <Link
        href={`/admin/clientes/${row.original.id}`}
        className="text-xs font-medium text-[#E31C23] hover:underline"
      >
        Ver perfil
      </Link>
    ),
  },
]

interface ClientesTableProps {
  customers: CustomerListDTO[]
  total: number
  page: number
  totalPages: number
  prevHref?: string
  nextHref?: string
}

export function ClientesTable({
  customers,
  total,
  page,
  totalPages,
  prevHref,
  nextHref,
}: ClientesTableProps) {
  return (
    <DataTable
      data={customers}
      columns={columns}
      pagination={{ page, totalPages, totalCount: total, unit: "clientes", prevHref, nextHref }}
      emptyMessage="No se encontraron clientes."
    />
  )
}
