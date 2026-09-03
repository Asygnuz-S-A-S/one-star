interface TopProduct {
  name: string
  brand: string
  sold: number
  revenue: number
}

interface TopProductsProps {
  products: TopProduct[]
}

const rankColors: Record<number, string> = {
  0: "bg-yellow-400 text-yellow-900",
  1: "bg-gray-300 text-gray-700",
  2: "bg-amber-600 text-amber-100",
}

import { formatCurrency } from "@/lib/dates"

export default function TopProducts({ products }: TopProductsProps) {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E0E0E0]">
        <h2 className="font-barlow font-bold text-base text-[#1C1C1C]">
          Top Productos
        </h2>
        <p className="font-montserrat text-xs text-[#4A4A4A] mt-0.5">
          Por unidades vendidas
        </p>
      </div>

      {products.length === 0 ? (
        <div className="px-5 py-8 text-center font-montserrat text-sm text-[#4A4A4A]">
          Sin datos de ventas aún.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F5F5] border-b border-[#E0E0E0]">
                <th className="font-montserrat text-xs font-medium text-[#4A4A4A] text-left px-4 py-3 w-10">
                  #
                </th>
                <th className="font-montserrat text-xs font-medium text-[#4A4A4A] text-left px-4 py-3">
                  Producto
                </th>
                <th className="font-montserrat text-xs font-medium text-[#4A4A4A] text-left px-4 py-3">
                  Marca
                </th>
                <th className="font-montserrat text-xs font-medium text-[#4A4A4A] text-right px-4 py-3">
                  Uds.
                </th>
                <th className="font-montserrat text-xs font-medium text-[#4A4A4A] text-right px-4 py-3">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr
                  key={index}
                  className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#F9F9F9] transition-colors"
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-montserrat font-bold ${
                        rankColors[index] ?? "bg-[#F0F0F0] text-[#4A4A4A]"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-montserrat text-sm text-[#1C1C1C] max-w-[160px] truncate">
                    {product.name}
                  </td>
                  <td className="px-4 py-3 font-montserrat text-xs text-[#4A4A4A]">
                    {product.brand}
                  </td>
                  <td className="px-4 py-3 font-montserrat text-sm text-[#1C1C1C] text-right font-medium">
                    {product.sold}
                  </td>
                  <td className="px-4 py-3 font-montserrat text-sm text-[#1C1C1C] text-right font-medium">
                    {formatCurrency(product.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
