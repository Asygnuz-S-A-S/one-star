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
    id: "club",
    header: "Club",
    cell: ({ row }) => (
      <span className="flex flex-wrap gap-1">
        {row.original.clubMember && <span className="rounded-full bg-[#1C1C1C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Club</span>}
        {row.original.newsletter && <span className="rounded-full border border-gray-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#4A4A4A]">Newsletter</span>}
        {!row.original.clubMember && !row.original.newsletter && <span className="text-xs text-gray-400">—</span>}
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
        className="inline-flex min-h-11 items-center text-xs font-medium text-[#E31C23] hover:underline"
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
  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <p className="text-[#4A4A4A] text-lg">No se encontraron clientes.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {customers.map((customer) => {
          const [local, domain] = customer.email.split("@")
          const name = [customer.name, customer.lastName].filter(Boolean).join(" ")
          return (
            <article key={customer.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="font-medium text-[#1C1C1C]">{name || local}</p>
              <p className="mt-1 break-words text-sm text-[#4A4A4A]">
                {domain ? <>{local}<wbr />@{domain}</> : customer.email}
              </p>
              <p className="mt-2 text-sm text-[#1C1C1C]">
                {customer.orderCount} pedidos · {formatCurrency(customer.ltv)}
              </p>
              <p className="mt-1 text-xs text-[#4A4A4A]">Desde {formatDate(customer.createdAt)}</p>
              <Link
                href={`/admin/clientes/${customer.id}`}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#E31C23] text-sm font-semibold text-white"
              >
                Ver perfil
              </Link>
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
          data={customers}
          columns={columns}
          pagination={{ page, totalPages, totalCount: total, unit: "clientes", prevHref, nextHref }}
          emptyMessage="No se encontraron clientes."
        />
      </div>
    </>
  )
}
