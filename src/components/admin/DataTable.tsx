"use client"

import { useState } from "react"
import Link from "next/link"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table"

interface PaginationProps {
  page: number
  totalPages: number
  totalCount: number
  unit?: string
  prevHref?: string
  nextHref?: string
}

interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  pagination?: PaginationProps
  emptyMessage?: string
  toolbar?: (selectedRows: TData[], clearSelection: () => void) => React.ReactNode
}

export function DataTable<TData>({
  data,
  columns,
  pagination,
  emptyMessage = "No se encontraron registros.",
  toolbar,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Tailwind v4 solo detecta clases literales; las interpoladas (`text-${x}`)
  // se purgan del build. Mapeamos a strings completos para que sí se apliquen.
  const alignClass: Record<string, string> = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Pagination is server-side; TanStack Table doesn't manage it
    manualPagination: true,
  })

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <p className="text-[#4A4A4A] text-lg">{emptyMessage}</p>
      </div>
    )
  }

  const selectedRows = table.getSelectedRowModel().rows.map(r => r.original)

  return (
    <>
      {toolbar && selectedRows.length > 0 && (
        <div className="mb-4">
          {toolbar(selectedRows, () => setRowSelection({}))}
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-gray-100 bg-gray-50"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    const align =
                      (header.column.columnDef.meta as { align?: string } | undefined)
                        ?.align ?? "left"

                    return (
                      <th
                        key={header.id}
                        className={`px-4 py-3 text-[#4A4A4A] font-semibold ${alignClass[align] ?? "text-left"} whitespace-nowrap select-none ${
                          canSort
                            ? "cursor-pointer hover:text-[#1C1C1C] transition-colors"
                            : ""
                        }`}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          {canSort && (
                            <SortIcon direction={sorted} />
                          )}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-gray-50">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => {
                    const align =
                      (cell.column.columnDef.meta as { align?: string } | undefined)
                        ?.align ?? "left"
                    return (
                      <td
                        key={cell.id}
                        className={`px-4 py-3 ${alignClass[align] ?? "text-left"}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[#4A4A4A]">
            Página {pagination.page} de {pagination.totalPages} ·{" "}
            {pagination.totalCount} {pagination.unit ?? "registros"}
          </p>
          <div className="flex gap-2">
            {pagination.prevHref ? (
              <Link
                href={pagination.prevHref}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-[#1C1C1C]"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed">
                ← Anterior
              </span>
            )}
            {pagination.nextHref ? (
              <Link
                href={pagination.nextHref}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-[#1C1C1C]"
              >
                Siguiente →
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed">
                Siguiente →
              </span>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  return (
    <span className="inline-flex flex-col gap-px opacity-50" aria-hidden>
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        className={direction === "asc" ? "opacity-100" : ""}
        fill="currentColor"
      >
        <path d="M4 0 L8 5 L0 5 Z" />
      </svg>
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        className={direction === "desc" ? "opacity-100" : ""}
        fill="currentColor"
      >
        <path d="M4 5 L0 0 L8 0 Z" />
      </svg>
    </span>
  )
}
