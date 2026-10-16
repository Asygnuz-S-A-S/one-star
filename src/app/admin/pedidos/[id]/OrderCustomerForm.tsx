"use client"

import { useId, useState, useTransition } from "react"
import { updateOrderCustomerDataAction } from "../actions"
import { COLOMBIA_DEPARTMENTS } from "@/lib/colombia-departments"

export interface OrderCustomerFormValues {
  customerName: string
  customerEmail: string
  phone: string
  address: string
  apartment: string
  city: string
  department: string
  postalCode: string
}

interface Props {
  orderId: string
  initial: OrderCustomerFormValues
}

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"

export default function OrderCustomerForm({ orderId, initial }: Props) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<OrderCustomerFormValues>(initial)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [isPending, startTransition] = useTransition()
  const formId = useId()

  function set<K extends keyof OrderCustomerFormValues>(key: K, value: OrderCustomerFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await updateOrderCustomerDataAction(orderId, {
        ...values,
        apartment: values.apartment || undefined,
        postalCode: values.postalCode || undefined,
      })
      if (result.success) {
        setMessage({ text: "Datos del cliente actualizados.", type: "success" })
        setOpen(false)
      } else {
        setMessage({ text: result.error ?? "No se pudieron guardar los datos.", type: "error" })
      }
    })
  }

  if (!open) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
        {message ? (
          <p className={`text-xs ${message.type === "success" ? "text-green-700" : "text-[#E31C23]"}`}>
            {message.text}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-semibold text-[#E31C23] hover:underline"
        >
          Editar datos del cliente
        </button>
      </div>
    )
  }

  const field = (key: keyof OrderCustomerFormValues) => `${formId}-${key}`

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-gray-100 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={field("customerName")} className="block text-xs font-semibold text-[#4A4A4A] mb-1">Nombre completo</label>
          <input id={field("customerName")} className={inputClass} value={values.customerName} onChange={(e) => set("customerName", e.target.value)} required />
        </div>
        <div>
          <label htmlFor={field("customerEmail")} className="block text-xs font-semibold text-[#4A4A4A] mb-1">Email</label>
          <input id={field("customerEmail")} type="email" className={inputClass} value={values.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} required />
        </div>
        <div>
          <label htmlFor={field("phone")} className="block text-xs font-semibold text-[#4A4A4A] mb-1">Teléfono</label>
          <input id={field("phone")} type="tel" className={inputClass} value={values.phone} onChange={(e) => set("phone", e.target.value)} required />
        </div>
        <div>
          <label htmlFor={field("postalCode")} className="block text-xs font-semibold text-[#4A4A4A] mb-1">Código postal</label>
          <input id={field("postalCode")} className={inputClass} value={values.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={field("address")} className="block text-xs font-semibold text-[#4A4A4A] mb-1">Dirección</label>
          <input id={field("address")} className={inputClass} value={values.address} onChange={(e) => set("address", e.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={field("apartment")} className="block text-xs font-semibold text-[#4A4A4A] mb-1">Apartamento / Casa / Oficina</label>
          <input id={field("apartment")} className={inputClass} value={values.apartment} onChange={(e) => set("apartment", e.target.value)} />
        </div>
        <div>
          <label htmlFor={field("city")} className="block text-xs font-semibold text-[#4A4A4A] mb-1">Ciudad</label>
          <input id={field("city")} className={inputClass} value={values.city} onChange={(e) => set("city", e.target.value)} required />
        </div>
        <div>
          <label htmlFor={field("department")} className="block text-xs font-semibold text-[#4A4A4A] mb-1">Departamento</label>
          <select id={field("department")} className={inputClass} value={values.department} onChange={(e) => set("department", e.target.value)} required>
            <option value="">Seleccionar…</option>
            {!COLOMBIA_DEPARTMENTS.includes(values.department) && values.department && (
              <option value={values.department}>{values.department}</option>
            )}
            {COLOMBIA_DEPARTMENTS.map((dep) => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <p className={`text-xs ${message.type === "success" ? "text-green-700" : "text-[#E31C23]"}`} role="status">
          {message.text}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => {
            setValues(initial)
            setMessage(null)
            setOpen(false)
          }}
          disabled={isPending}
          className="text-sm text-[#4A4A4A] px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="bg-[#1C1C1C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#4A4A4A] transition-colors disabled:opacity-60"
        >
          {isPending ? "Guardando…" : "Guardar datos"}
        </button>
      </div>
    </form>
  )
}
