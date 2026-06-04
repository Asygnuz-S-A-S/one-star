"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCart } from "@/context/CartContext"
import { formatCOP } from "@/lib/shop-utils"
import { COLOMBIA_DEPARTMENTS } from "@/lib/colombia-departments"
import CheckoutStepper from "@/components/checkout/CheckoutStepper"
import OrderSummary from "@/components/checkout/OrderSummary"
import { createOrder } from "./actions"

// ─── Types ───────────────────────────────────────────────────────────────────

type ShippingMethod = "standard" | "express"
type PaymentMethod = "epayco" | "mercadopago" | "addi"

interface FormValues {
  email: string
  newsletter: boolean
  name: string
  lastName: string
  phone: string
  address: string
  apartment: string
  city: string
  department: string
  postalCode: string
  saveAddress: boolean
  shippingMethod: ShippingMethod
  paymentMethod: PaymentMethod
  cardNumber: string
  cardName: string
  cardExpiry: string
  cardCvv: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

// ─── Constants ────────────────────────────────────────────────────────────────

const STANDARD_SHIPPING_THRESHOLD = 200_000
const STANDARD_SHIPPING_COST = 15_000
const EXPRESS_SHIPPING_COST = 25_000

function getShippingCost(method: ShippingMethod, subtotal: number): number {
  if (method === "express") return EXPRESS_SHIPPING_COST
  return subtotal >= STANDARD_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function validatePhone(phone: string): boolean {
  return /^[0-9]{7,15}$/.test(phone.replace(/\s/g, ""))
}

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.email.trim()) {
    errors.email = "El email es requerido"
  } else if (!validateEmail(values.email)) {
    errors.email = "Ingresa un email válido"
  }

  if (!values.name.trim()) errors.name = "El nombre es requerido"
  if (!values.lastName.trim()) errors.lastName = "El apellido es requerido"
  if (!values.phone.trim()) {
    errors.phone = "El teléfono es requerido"
  } else if (!validatePhone(values.phone)) {
    errors.phone = "Ingresa un teléfono válido (solo números)"
  }
  if (!values.address.trim()) errors.address = "La dirección es requerida"
  if (!values.city.trim()) errors.city = "La ciudad es requerida"
  if (!values.department) errors.department = "El departamento es requerido"

  if (values.paymentMethod !== "addi") {
    if (!values.cardNumber.trim()) errors.cardNumber = "El número de tarjeta es requerido"
    if (!values.cardName.trim()) errors.cardName = "El nombre en la tarjeta es requerido"
    if (!values.cardExpiry.trim()) errors.cardExpiry = "La fecha de vencimiento es requerida"
    if (!values.cardCvv.trim()) errors.cardCvv = "El CVV es requerido"
  }

  return errors
}

// ─── Field component ──────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

function Field({ label, error, required, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-montserrat font-medium text-[#4A4A4A] uppercase tracking-wide mb-1">
        {label}
        {required && <span className="text-[#E31C23] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-[#E31C23] font-montserrat">{error}</p>
      )}
    </div>
  )
}

const inputClass =
  "w-full border border-[#E0E0E0] rounded px-3 py-2.5 text-sm font-montserrat text-[#1C1C1C] placeholder-[#9E9E9E] bg-white focus:outline-none focus:border-[#1C1C1C] transition-colors"

const inputErrorClass =
  "w-full border border-[#E31C23] rounded px-3 py-2.5 text-sm font-montserrat text-[#1C1C1C] placeholder-[#9E9E9E] bg-white focus:outline-none focus:border-[#E31C23] transition-colors"

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()

  const [hasAccount, setHasAccount] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")

  const [values, setValues] = useState<FormValues>({
    email: "",
    newsletter: false,
    name: "",
    lastName: "",
    phone: "",
    address: "",
    apartment: "",
    city: "",
    department: "",
    postalCode: "",
    saveAddress: false,
    shippingMethod: "standard",
    paymentMethod: "epayco",
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvv: "",
  })

  const shippingCost = getShippingCost(values.shippingMethod, subtotal)
  const total = subtotal + shippingCost

  const set = useCallback(
    <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }))
      setErrors((prev) => {
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
    },
    []
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError("")

    const validationErrors = validateForm(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      // Scroll to first error
      const firstErrorKey = Object.keys(validationErrors)[0]
      document.querySelector(`[data-field="${firstErrorKey}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      return
    }

    if (items.length === 0) {
      setServerError("Tu carrito está vacío")
      return
    }

    setSubmitting(true)

    const result = await createOrder({
      email: values.email,
      name: values.name,
      lastName: values.lastName,
      phone: values.phone,
      address: values.address,
      apartment: values.apartment || undefined,
      city: values.city,
      department: values.department,
      postalCode: values.postalCode || undefined,
      shippingMethod: values.shippingMethod,
      paymentMethod: values.paymentMethod,
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      subtotal,
      shippingCost,
      total,
    })

    setSubmitting(false)

    if (result.success && result.orderId) {
      clearCart()
      router.push(`/checkout/success?orderId=${result.orderId}`)
    } else {
      setServerError(result.error ?? "Error al procesar el pedido")
    }
  }

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Brand + stepper */}
        <div className="text-center mb-6">
          <Link href="/" className="font-barlow font-bold text-2xl text-[#1C1C1C] tracking-tight">
            ONE STAR
          </Link>
        </div>

        <CheckoutStepper currentStep={2} />

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col-reverse md:flex-row gap-8 items-start">
            {/* ── LEFT: Form ── */}
            <div className="w-full md:w-[55%] space-y-6">

              {/* ── Section 1: Contact ── */}
              <section className="bg-white rounded-lg p-6">
                <h2 className="font-barlow font-bold text-sm uppercase tracking-widest text-[#1C1C1C] mb-4">
                  Información de contacto
                </h2>

                {/* Account toggle */}
                <div className="flex items-center gap-4 mb-5 text-sm font-montserrat text-[#4A4A4A]">
                  <span>¿Ya tienes cuenta?</span>
                  <button
                    type="button"
                    onClick={() => setHasAccount(true)}
                    className={`underline hover:text-[#E31C23] transition-colors ${hasAccount ? "text-[#E31C23]" : ""}`}
                  >
                    Sí, iniciar sesión
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setHasAccount(false)}
                    className={`underline hover:text-[#1C1C1C] transition-colors ${!hasAccount ? "text-[#1C1C1C] font-medium" : ""}`}
                  >
                    No, continuar como invitado
                  </button>
                </div>

                {hasAccount ? (
                  <div className="bg-[#F5F5F5] rounded-md p-4 text-sm font-montserrat text-[#4A4A4A] text-center">
                    <Link href="/login" className="text-[#E31C23] underline font-medium">
                      Ir a iniciar sesión
                    </Link>{" "}
                    para continuar con tu cuenta.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div data-field="email">
                      <Field label="Email" required error={errors.email}>
                        <input
                          type="email"
                          value={values.email}
                          onChange={(e) => set("email", e.target.value)}
                          placeholder="hola@ejemplo.com"
                          className={errors.email ? inputErrorClass : inputClass}
                          autoComplete="email"
                        />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={values.newsletter}
                        onChange={(e) => set("newsletter", e.target.checked)}
                        className="w-4 h-4 rounded border-[#E0E0E0] accent-[#E31C23]"
                      />
                      <span className="text-sm font-montserrat text-[#4A4A4A]">
                        Recibir novedades y ofertas
                      </span>
                    </label>
                  </div>
                )}
              </section>

              {/* ── Section 2: Shipping Address ── */}
              <section className="bg-white rounded-lg p-6">
                <h2 className="font-barlow font-bold text-sm uppercase tracking-widest text-[#1C1C1C] mb-4">
                  Dirección de envío
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div data-field="name">
                    <Field label="Nombre" required error={errors.name}>
                      <input
                        type="text"
                        value={values.name}
                        onChange={(e) => set("name", e.target.value)}
                        placeholder="Juan"
                        className={errors.name ? inputErrorClass : inputClass}
                        autoComplete="given-name"
                      />
                    </Field>
                  </div>
                  <div data-field="lastName">
                    <Field label="Apellido" required error={errors.lastName}>
                      <input
                        type="text"
                        value={values.lastName}
                        onChange={(e) => set("lastName", e.target.value)}
                        placeholder="Pérez"
                        className={errors.lastName ? inputErrorClass : inputClass}
                        autoComplete="family-name"
                      />
                    </Field>
                  </div>
                  <div data-field="phone" className="sm:col-span-2">
                    <Field label="Teléfono" required error={errors.phone}>
                      <input
                        type="tel"
                        value={values.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="3001234567"
                        className={errors.phone ? inputErrorClass : inputClass}
                        autoComplete="tel"
                      />
                    </Field>
                  </div>
                  <div data-field="address" className="sm:col-span-2">
                    <Field label="Dirección" required error={errors.address}>
                      <input
                        type="text"
                        value={values.address}
                        onChange={(e) => set("address", e.target.value)}
                        placeholder="Calle 123 #45-67"
                        className={errors.address ? inputErrorClass : inputClass}
                        autoComplete="street-address"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Apartamento / Casa / Oficina">
                      <input
                        type="text"
                        value={values.apartment}
                        onChange={(e) => set("apartment", e.target.value)}
                        placeholder="Apto 301 (opcional)"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <div data-field="city">
                    <Field label="Ciudad" required error={errors.city}>
                      <input
                        type="text"
                        value={values.city}
                        onChange={(e) => set("city", e.target.value)}
                        placeholder="Medellín"
                        className={errors.city ? inputErrorClass : inputClass}
                        autoComplete="address-level2"
                      />
                    </Field>
                  </div>
                  <div data-field="department">
                    <Field label="Departamento" required error={errors.department}>
                      <select
                        value={values.department}
                        onChange={(e) => set("department", e.target.value)}
                        className={`${errors.department ? inputErrorClass : inputClass} cursor-pointer`}
                      >
                        <option value="">Seleccionar...</option>
                        {COLOMBIA_DEPARTMENTS.map((dep) => (
                          <option key={dep} value={dep}>
                            {dep}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Código postal">
                      <input
                        type="text"
                        value={values.postalCode}
                        onChange={(e) => set("postalCode", e.target.value)}
                        placeholder="110111 (opcional)"
                        className={inputClass}
                        autoComplete="postal-code"
                      />
                    </Field>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={values.saveAddress}
                    onChange={(e) => set("saveAddress", e.target.checked)}
                    className="w-4 h-4 rounded border-[#E0E0E0] accent-[#E31C23]"
                  />
                  <span className="text-sm font-montserrat text-[#4A4A4A]">
                    Guardar esta dirección para futuras compras
                  </span>
                </label>
              </section>

              {/* ── Section 3: Shipping Method ── */}
              <section className="bg-white rounded-lg p-6">
                <h2 className="font-barlow font-bold text-sm uppercase tracking-widest text-[#1C1C1C] mb-4">
                  Método de envío
                </h2>
                <div className="space-y-3">
                  {/* Standard */}
                  <label
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                      values.shippingMethod === "standard"
                        ? "border-[#1C1C1C] bg-[#F5F5F5]"
                        : "border-[#E0E0E0] hover:border-[#4A4A4A]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="standard"
                        checked={values.shippingMethod === "standard"}
                        onChange={() => set("shippingMethod", "standard")}
                        className="accent-[#E31C23]"
                      />
                      <div>
                        <p className="text-sm font-montserrat font-medium text-[#1C1C1C]">
                          Envío estándar (3-5 días hábiles)
                        </p>
                        {subtotal >= STANDARD_SHIPPING_THRESHOLD && (
                          <p className="text-xs text-green-600 font-montserrat mt-0.5">
                            ¡Envío gratis por compras mayores a {formatCOP(STANDARD_SHIPPING_THRESHOLD)}!
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-montserrat font-medium text-[#1C1C1C]">
                      {subtotal >= STANDARD_SHIPPING_THRESHOLD ? (
                        <span className="text-green-600">Gratis</span>
                      ) : (
                        formatCOP(STANDARD_SHIPPING_COST)
                      )}
                    </span>
                  </label>

                  {/* Express */}
                  <label
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                      values.shippingMethod === "express"
                        ? "border-[#1C1C1C] bg-[#F5F5F5]"
                        : "border-[#E0E0E0] hover:border-[#4A4A4A]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="express"
                        checked={values.shippingMethod === "express"}
                        onChange={() => set("shippingMethod", "express")}
                        className="accent-[#E31C23]"
                      />
                      <p className="text-sm font-montserrat font-medium text-[#1C1C1C]">
                        Envío express (1-2 días hábiles)
                      </p>
                    </div>
                    <span className="text-sm font-montserrat font-medium text-[#1C1C1C]">
                      {formatCOP(EXPRESS_SHIPPING_COST)}
                    </span>
                  </label>
                </div>
              </section>

              {/* ── Section 4: Payment ── */}
              <section className="bg-white rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-barlow font-bold text-sm uppercase tracking-widest text-[#1C1C1C]">
                    Pago seguro
                  </h2>
                  <span className="flex items-center gap-1 text-xs font-montserrat text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Pago 100% seguro
                  </span>
                </div>

                <div className="space-y-3">
                  {/* ePayco */}
                  <PaymentOption
                    value="epayco"
                    current={values.paymentMethod}
                    onChange={(v) => set("paymentMethod", v as PaymentMethod)}
                    title="ePayco"
                    description="Paga con tarjeta crédito/débito, PSE o efectivo"
                  />

                  {/* Mercadopago */}
                  <PaymentOption
                    value="mercadopago"
                    current={values.paymentMethod}
                    onChange={(v) => set("paymentMethod", v as PaymentMethod)}
                    title="Mercadopago"
                    description="Paga con tarjeta o transferencia"
                  />

                  {/* Addi */}
                  <PaymentOption
                    value="addi"
                    current={values.paymentMethod}
                    onChange={(v) => set("paymentMethod", v as PaymentMethod)}
                    title="Addi"
                    description="Compra ahora, paga después en cuotas"
                  />
                </div>

                {/* Card fields for ePayco / Mercadopago */}
                {values.paymentMethod !== "addi" && (
                  <div className="mt-5 border-t border-[#F0F0F0] pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div data-field="cardNumber" className="sm:col-span-2">
                      <Field label="Número de tarjeta" required error={errors.cardNumber}>
                        <input
                          type="text"
                          value={values.cardNumber}
                          onChange={(e) => set("cardNumber", e.target.value.replace(/\D/g, "").slice(0, 16))}
                          placeholder="1234 5678 9012 3456"
                          className={errors.cardNumber ? inputErrorClass : inputClass}
                          inputMode="numeric"
                          autoComplete="cc-number"
                        />
                      </Field>
                    </div>
                    <div data-field="cardName" className="sm:col-span-2">
                      <Field label="Nombre en la tarjeta" required error={errors.cardName}>
                        <input
                          type="text"
                          value={values.cardName}
                          onChange={(e) => set("cardName", e.target.value.toUpperCase())}
                          placeholder="JUAN PÉREZ"
                          className={errors.cardName ? inputErrorClass : inputClass}
                          autoComplete="cc-name"
                        />
                      </Field>
                    </div>
                    <div data-field="cardExpiry">
                      <Field label="Vencimiento" required error={errors.cardExpiry}>
                        <input
                          type="text"
                          value={values.cardExpiry}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, "").slice(0, 4)
                            if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2)
                            set("cardExpiry", v)
                          }}
                          placeholder="MM/AA"
                          className={errors.cardExpiry ? inputErrorClass : inputClass}
                          inputMode="numeric"
                          autoComplete="cc-exp"
                        />
                      </Field>
                    </div>
                    <div data-field="cardCvv">
                      <Field label="CVV" required error={errors.cardCvv}>
                        <input
                          type="password"
                          value={values.cardCvv}
                          onChange={(e) => set("cardCvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="•••"
                          className={errors.cardCvv ? inputErrorClass : inputClass}
                          inputMode="numeric"
                          autoComplete="cc-csc"
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {/* Addi redirect notice */}
                {values.paymentMethod === "addi" && (
                  <div className="mt-5 border-t border-[#F0F0F0] pt-5">
                    <p className="text-sm font-montserrat text-[#4A4A4A] bg-[#F5F5F5] rounded-md p-3 text-center">
                      Serás redirigido a{" "}
                      <span className="font-medium text-[#1C1C1C]">Addi</span> para completar tu
                      compra en cuotas sin intereses.
                    </p>
                  </div>
                )}
              </section>

              {/* Server error */}
              {serverError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-montserrat text-[#E31C23]">{serverError}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#E31C23] hover:bg-[#c21920] disabled:bg-[#4A4A4A] text-white font-barlow font-bold text-base uppercase tracking-wider py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Completar pedido — {formatCOP(total)}
                  </>
                )}
              </button>

              <p className="text-center text-xs font-montserrat text-[#4A4A4A]">
                Al completar tu pedido aceptas nuestros{" "}
                <Link href="/terminos" className="underline hover:text-[#1C1C1C]">
                  Términos y condiciones
                </Link>
                .
              </p>
            </div>

            {/* ── RIGHT: Order Summary ── */}
            <div className="w-full md:w-[45%] md:sticky md:top-28">
              <OrderSummary shippingCost={shippingCost} />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PaymentOption sub-component ─────────────────────────────────────────────

interface PaymentOptionProps {
  value: string
  current: string
  onChange: (value: string) => void
  title: string
  description: string
}

function PaymentOption({ value, current, onChange, title, description }: PaymentOptionProps) {
  const isSelected = current === value

  return (
    <label
      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
        isSelected ? "border-[#1C1C1C] bg-[#F5F5F5]" : "border-[#E0E0E0] hover:border-[#4A4A4A]"
      }`}
    >
      <input
        type="radio"
        name="paymentMethod"
        value={value}
        checked={isSelected}
        onChange={() => onChange(value)}
        className="accent-[#E31C23] flex-shrink-0"
      />
      <div className="flex-1">
        <p className="text-sm font-montserrat font-bold text-[#1C1C1C]">{title}</p>
        <p className="text-xs font-montserrat text-[#4A4A4A] mt-0.5">{description}</p>
      </div>
    </label>
  )
}
