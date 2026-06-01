interface LowStockVariant {
  sku: string
  productName: string
  size: string
  color: string
  stock: number
}

interface LowStockAlertsProps {
  variants: LowStockVariant[]
}

export default function LowStockAlerts({ variants }: LowStockAlertsProps) {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E0E0E0]">
        <h2 className="font-barlow font-bold text-base text-[#1C1C1C]">
          Alertas de Inventario
        </h2>
        <p className="font-montserrat text-xs text-[#4A4A4A] mt-0.5">
          Variantes con stock &le; 3
        </p>
      </div>

      {variants.length === 0 ? (
        <div className="px-5 py-8 flex flex-col items-center gap-2">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="font-montserrat text-sm text-green-600 font-medium">
            Todo el inventario OK
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#F0F0F0] max-h-72 overflow-y-auto">
          {variants.map((variant) => (
            <div
              key={variant.sku}
              className="flex items-center justify-between px-5 py-3 hover:bg-[#F9F9F9] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-montserrat text-sm font-medium text-[#1C1C1C] truncate">
                  {variant.productName}
                </p>
                <p className="font-montserrat text-xs text-[#4A4A4A] mt-0.5">
                  SKU: {variant.sku} · T: {variant.size} · {variant.color}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className="font-montserrat text-sm font-medium text-[#1C1C1C]">
                  {variant.stock} uds.
                </span>
                {variant.stock === 0 ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-montserrat font-bold bg-red-100 text-[#E31C23] uppercase tracking-wide">
                    Agotado
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-montserrat font-bold bg-orange-100 text-orange-700 uppercase tracking-wide">
                    Bajo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
