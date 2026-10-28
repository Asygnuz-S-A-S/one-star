"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import {
  previewProductImportAction,
  applyProductImportAction,
} from "./actions"
import type {
  ProductImportPreview,
  ProductImportApplyResult,
  TextUpdateMode,
} from "@/server/services/product-import.service"

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  create_product: { label: "Crear producto", className: "bg-green-50 text-green-800" },
  add_variant: { label: "Agregar variante", className: "bg-blue-50 text-blue-800" },
  update_variant: { label: "Actualizar variante", className: "bg-amber-50 text-amber-800" },
  error: { label: "Error", className: "bg-red-50 text-red-800" },
  skip: { label: "Omitida", className: "bg-gray-100 text-gray-700" },
}

export default function ImportarProductosPage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [onlyReadyRows, setOnlyReadyRows] = useState(true)
  const [textUpdateMode, setTextUpdateMode] = useState<TextUpdateMode>("fill_empty")
  const [preview, setPreview] = useState<ProductImportPreview | null>(null)
  const [result, setResult] = useState<ProductImportApplyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePreview() {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    const formData = new FormData()
    formData.set("file", file)
    formData.set("onlyReadyRows", String(onlyReadyRows))
    formData.set("textUpdateMode", textUpdateMode)
    const res = await previewProductImportAction(formData)
    setLoading(false)
    if (!res.success || !res.data) {
      setError(res.error ?? "No se pudo generar la vista previa.")
      setPreview(null)
      return
    }
    setPreview(res.data)
  }

  async function handleConfirm() {
    if (!file || !preview) return
    setLoading(true)
    setError(null)
    const formData = new FormData()
    formData.set("file", file)
    formData.set("fingerprint", preview.fingerprint)
    formData.set("onlyReadyRows", String(onlyReadyRows))
    formData.set("textUpdateMode", textUpdateMode)
    const res = await applyProductImportAction(formData)
    setLoading(false)
    if (!res.success || !res.data) {
      setError(res.error ?? "No se pudo confirmar la importación.")
      return
    }
    setResult(res.data)
    setPreview(null)
    setFile(null)
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Importar productos desde Excel</h1>
        <Link href="/admin/productos" className="text-sm text-gray-600 hover:underline">
          Volver a productos
        </Link>
      </div>

      <p className="mb-6 max-w-3xl text-sm text-gray-600">
        Sube el archivo con la plantilla de carga de productos. Primero se genera una vista previa
        (no se guarda nada todavía); revísala y confirma para escribir los cambios. Los productos
        que ya gestiona el ERP nunca se modifican desde aquí.
      </p>

      {result && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          Importación completada: {result.newProducts} producto(s) nuevo(s), {result.newVariants}{" "}
          variante(s) nueva(s), {result.updatedVariants} variante(s) actualizada(s).
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      )}

      {!preview && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Seleccionar archivo Excel</span>
            <a
              href="/plantillas/plantilla_carga_productos_onestar.xlsx"
              download
              className="inline-flex min-h-11 items-center text-xs font-medium text-blue-600 hover:underline"
            >
              Descargar plantilla de ejemplo (.xlsx)
            </a>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-[#1C1C1C]"
          >
            {file ? file.name : "Elegir archivo Excel"}
          </button>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyReadyRows}
              onChange={(e) => setOnlyReadyRows(e.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            Importar solo filas marcadas como listas (&quot;PRODUCTO LISTO = OK&quot; si la columna existe; los no listos se desactivan)
          </label>

          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/70 p-3">
            <span className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              Modo de actualización de textos (descripción, categoría, género):
            </span>
            <div className="flex flex-col sm:flex-row gap-4 text-xs text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="textUpdateMode"
                  value="fill_empty"
                  checked={textUpdateMode === "fill_empty"}
                  onChange={() => setTextUpdateMode("fill_empty")}
                  className="accent-gray-900"
                />
                <span>
                  <strong>Solo llenar campos vacíos</strong> (por defecto: conserva descripciones y fotos manuales)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="textUpdateMode"
                  value="overwrite"
                  checked={textUpdateMode === "overwrite"}
                  onChange={() => setTextUpdateMode("overwrite")}
                  className="accent-gray-900"
                />
                <span>Sobrescribir textos existentes con el archivo</span>
              </label>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              * El precio, oferta y stock siempre son actualizados desde el archivo para todos los productos en modo ARCHIVO.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePreview}
            disabled={!file || loading}
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Procesando..." : "Generar vista previa"}
          </button>
        </div>
      )}

      {preview && (
        <div>
          <div className="mb-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
              {preview.summary.newProducts} producto(s) nuevo(s)
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">
              {preview.summary.newVariants} variante(s) nueva(s)
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
              {preview.summary.updatedVariants} variante(s) a actualizar
            </span>
            {(preview.summary.skipped ?? 0) > 0 && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                {preview.summary.skipped} fila(s) omitida(s)
              </span>
            )}
            {(preview.summary.deactivatedProducts ?? 0) > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-red-800 font-medium">
                {preview.summary.deactivatedProducts} producto(s) a desactivar
              </span>
            )}
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">
              {preview.summary.errors} error(es)
            </span>
          </div>

          {/* Resumen por producto: precio, stock y tallas */}
          {preview.products && preview.products.length > 0 && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-2">
                Resumen de cambios por producto ({preview.products.length} productos afectados)
              </h3>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-[10px] uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2">SKU Base</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Precio</th>
                      <th className="px-3 py-2">Stock total</th>
                      <th className="px-3 py-2">Tallas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.products.map((p, idx) => (
                      <tr key={p.productId || idx}>
                        <td className="px-3 py-2 font-medium text-gray-900">{p.productName}</td>
                        <td className="px-3 py-2 font-mono text-gray-600">{p.baseSku || "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              p.isDeactivated
                                ? "bg-red-50 text-red-800 border border-red-200"
                                : p.isExisting
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-green-50 text-green-800 border border-green-200"
                            }`}
                          >
                            {p.isDeactivated ? "Se desactiva" : p.isExisting ? "Existente" : "Nuevo"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {p.isExisting && p.priceBefore != null ? (
                            <span>
                              <span className="text-gray-400 line-through mr-1">
                                ${p.priceBefore.toLocaleString("es-CO")}
                              </span>
                              → <span className="font-semibold text-gray-900">${p.priceAfter.toLocaleString("es-CO")}</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-900">${p.priceAfter.toLocaleString("es-CO")}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {p.isExisting && p.stockBefore != null ? (
                            <span>
                              <span className="text-gray-400 mr-1">{p.stockBefore}</span>
                              → <span className="font-semibold text-gray-900">{p.stockAfter}</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-900">{p.stockAfter}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {p.isDeactivated ? (
                            <span className="text-red-700 font-medium">No listo en archivo</span>
                          ) : (
                            <>
                              {p.addedSizesCount > 0 && (
                                <span className="text-blue-700 font-medium mr-2">+{p.addedSizesCount} nueva(s)</span>
                              )}
                              {p.updatedVariantsCount > 0 && (
                                <span className="text-amber-700 font-medium">{p.updatedVariantsCount} actualiz.</span>
                              )}
                              {p.addedSizesCount === 0 && p.updatedVariantsCount === 0 && "Sin cambios"}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Fila</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Acción</th>
                  <th className="px-3 py-2">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber}>
                    <td className="px-3 py-2 text-gray-500">{r.rowNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.sku}</td>
                    <td className="px-3 py-2">{r.productName}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${ACTION_LABELS[r.action].className}`}>
                        {ACTION_LABELS[r.action].label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || preview.summary.newProducts + preview.summary.newVariants + preview.summary.updatedVariants === 0}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Confirmar importación"}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Cancelar / subir otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
