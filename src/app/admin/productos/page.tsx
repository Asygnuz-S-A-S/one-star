/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: Some Product fields (brand, gender, etc.) are in schema.prisma but not
// yet in the generated Prisma client — will resolve after `prisma generate`.
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/server/db/prisma"

const PAGE_SIZE = 20

interface SearchParams {
  page?: string
  q?: string
  category?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function ProductosPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1") || 1)
  const q = params.q?.trim() ?? ""
  const categoryFilter = params.category ?? ""

  const where = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { brand: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(categoryFilter ? { categoryId: categoryFilter } : {}),
  }

  const db = prisma as any

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        images: {
          orderBy: { position: "asc" },
          take: 1,
        },
        variants: { select: { stock: true } },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  type ProductRow = any
  function getStatus(product: ProductRow) {
    const totalStock = product.variants.reduce((sum: number, v: { stock: number }) => sum + v.stock, 0)
    if (totalStock === 0) return { label: "AGOTADO", color: "bg-gray-100 text-gray-600" }
    if (product.isOnSale) return { label: "SALE", color: "bg-red-100 text-[#E31C23]" }
    return { label: "ACTIVO", color: "bg-green-100 text-green-700" }
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Productos
          <span className="ml-2 text-sm font-normal text-[#4A4A4A]">({total})</span>
        </h1>
        <Link
          href="/admin/productos/nuevo"
          className="bg-[#E31C23] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          + Nuevo producto
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o marca…"
          className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />
        <select
          name="category"
          defaultValue={categoryFilter}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          <option value="">Todas las categorías</option>
          {(categories as { id: string; name: string }[]).map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-[#1C1C1C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#4A4A4A] transition-colors"
        >
          Filtrar
        </button>
        {(q || categoryFilter) && (
          <Link
            href="/admin/productos"
            className="text-sm text-[#4A4A4A] px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-[#4A4A4A] text-lg mb-4">
            {q || categoryFilter ? "No se encontraron productos con esos filtros." : "Aún no hay productos."}
          </p>
          <Link
            href="/admin/productos/nuevo"
            className="inline-block bg-[#E31C23] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Crear primer producto
          </Link>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold w-16">Foto</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Nombre</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Marca</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Categoría</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Precio</th>
                    <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Estado</th>
                    <th className="text-right px-4 py-3 text-[#4A4A4A] font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(products as ProductRow[]).map((product: ProductRow) => {
                    const status = getStatus(product)
                    const firstImage = product.images[0]
                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {firstImage ? (
                              <Image
                                src={firstImage.url}
                                alt={firstImage.alt}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                                Sin foto
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-[#1C1C1C]">{product.name}</span>
                          <br />
                          <span className="text-xs text-[#4A4A4A]">{product.slug}</span>
                        </td>
                        <td className="px-4 py-3 text-[#4A4A4A]">{product.brand ?? "—"}</td>
                        <td className="px-4 py-3 text-[#4A4A4A]">{product.category.name}</td>
                        <td className="px-4 py-3">
                          {product.isOnSale && product.salePrice ? (
                            <div>
                              <span className="text-[#E31C23] font-semibold">${Number(product.salePrice).toLocaleString("es-CO")}</span>
                              <span className="text-xs line-through text-gray-400 ml-1">${Number(product.basePrice).toLocaleString("es-CO")}</span>
                            </div>
                          ) : (
                            <span className="font-semibold text-[#1C1C1C]">${Number(product.basePrice).toLocaleString("es-CO")}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/productos/${product.id}`}
                              className="text-xs font-medium text-[#E31C23] hover:underline"
                            >
                              Editar
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link
                              href={`/productos/${product.slug}`}
                              target="_blank"
                              className="text-xs font-medium text-[#4A4A4A] hover:underline"
                            >
                              Ver en tienda
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-[#4A4A4A]">
              Página {page} de {totalPages} · {total} productos
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={`/admin/productos?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${categoryFilter ? `&category=${categoryFilter}` : ""}`}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-[#1C1C1C]"
                >
                  ← Anterior
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed">
                  ← Anterior
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={`/admin/productos?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${categoryFilter ? `&category=${categoryFilter}` : ""}`}
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
        </>
      )}
    </div>
  )
}
