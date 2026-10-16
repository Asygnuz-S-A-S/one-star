"use client"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "./DataTable"
import type { OrderDTO } from "@/server/services/order.service"
import { formatDate, formatCurrency } from "@/lib/dates"
import {
  orderStatusBadge,
  orderStatusLabel,
  paymentStatusBadge,
  paymentStatusLabel,
} from "@/lib/order-status"

const columns: ColumnDef<OrderDTO, unknown>[] = [
  {
    id: "id",
    header: "Pedido",
    accessorKey: "id",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-[#4A4A4A]">
        #{row.original.id.slice(-8).toUpperCase()}
      </span>
    ),
  },
  {
    id: "createdAt",
    header: "Fecha",
    accessorKey: "createdAt",
    cell: ({ row }) => (
      <span className="text-[#4A4A4A] whitespace-nowrap">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: "cliente",
    header: "Cliente",
    accessorFn: (row) =>
      row.customerName ?? row.userEmail ?? row.customerEmail ?? "",
    cell: ({ row }) => {
      const name =
        row.original.customerName ??
        row.original.userEmail ??
        row.original.customerEmail ??
        "—"
      return (
        <span className="text-[#1C1C1C] max-w-[160px] truncate block">{name}</span>
      )
    },
  },
  {
    id: "productos",
    header: "Productos",
    accessorFn: (row) => row.items?.length ?? 0,
    cell: ({ row }) => (
      <span className="text-[#4A4A4A]">{row.original.items?.length ?? 0}</span>
    ),
  },
  {
    id: "total",
    header: "Total",
    accessorKey: "total",
    cell: ({ row }) => (
      <span className="font-semibold text-[#1C1C1C]">
        {formatCurrency(Number(row.original.total))}
      </span>
    ),
  },
  {
    id: "paymentStatus",
    header: "Pago",
    accessorKey: "paymentStatus",
    cell: ({ row }) => (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${paymentStatusBadge(row.original.paymentStatus)}`}
        title={row.original.paymentReference ? `Ref. ePayco ${row.original.paymentReference}` : undefined}
      >
        {paymentStatusLabel(row.original.paymentStatus)}
      </span>
    ),
  },
  {
    id: "status",
    header: "Estado",
    accessorKey: "status",
    cell: ({ row }) => (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${orderStatusBadge(row.original.status)}`}
      >
        {orderStatusLabel(row.original.status)}
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
        href={`/admin/pedidos/${row.original.id}`}
        className="text-xs font-medium text-[#E31C23] hover:underline"
      >
        Ver detalle
      </Link>
    ),
  },
]

interface PedidosTableProps {
  orders: OrderDTO[]
  total: number
  page: number
  totalPages: number
  prevHref?: string
  nextHref?: string
}

export function PedidosTable({
  orders,
  total,
  page,
  totalPages,
  prevHref,
  nextHref,
}: PedidosTableProps) {
  return (
    <DataTable
      data={orders}
      columns={columns}
      pagination={{ page, totalPages, totalCount: total, unit: "pedidos", prevHref, nextHref }}
      emptyMessage="No se encontraron pedidos."
    />
  )
}
