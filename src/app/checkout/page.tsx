"use client"

import { useState, useCallback, useEffect, useId, useRef, cloneElement, isValidElement } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { useCart, useCartStore } from "@/store"
import { formatCOP } from "@/lib/shop-utils"
import { buildMetaCommerceParams, trackMetaEvent } from "@/lib/tracking/meta-pixel"
import { COLOMBIA_DEPARTMENTS } from "@/lib/colombia-departments"
import { getShippingCost } from "@/lib/shipping"
import { useDeliveryDays, useShippingRates } from "@/components/storefront/ShippingRatesProvider"
import {
  clearCheckoutDraft,
  getCheckoutSessionStorage,
  loadCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutFormDraft,
} from "@/lib/checkout-draft"
import CheckoutStepper from "@/components/checkout/CheckoutStepper"
import OrderSummary, { type AppliedCoupon } from "@/components/checkout/OrderSummary"
import EpaycoButton, { type EpaycoCheckoutData } from "@/components/checkout/EpaycoButton"
import CheckoutAuthGate from "@/components/checkout/CheckoutAuthGate"
import { useSession } from "@/lib/auth-client"
import { captureAbandonedCartAction } from "@/server/actions/abandoned-cart.actions"
import { validateCouponAction } from "@/server/actions/coupon.actions"
import { createOrder } from "./actions"

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.08, ease: "easeOut" as const },
  }),
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

type FormValues = CheckoutFormDraft

type FormErrors = Partial<Record<keyof FormValues, string>>

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM_VALUES: FormValues = {
  email: "",
  documentType: "CC",
  cedula: "",
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
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function validatePhone(phone: string): boolean {
  return /^[0-9]{7,15}$/.test(phone.replace(/\s/g, ""))
}

function validateCedula(cedula: string): boolean {
  return /^[0-9]{6,12}$/.test(cedula.replace(/\s/g, ""))
}

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {}
  if (!values.email.trim()) errors.email = "El email es requerido"
  else if (!validateEmail(values.email)) errors.email = "Ingresa un email válido"
  if (!values.name.trim()) errors.name = "El nombre es requerido"
  if (!values.lastName.trim()) errors.lastName = "El apellido es requerido"
  if (!values.cedula.trim()) errors.cedula = "La cédula o NIT es requerida para facturación"
  else if (!validateCedula(values.cedula)) errors.cedula = "Ingresa un documento válido (6 a 12 dígitos)"
  if (!values.phone.trim()) errors.phone = "El teléfono es requerido"
  else if (!validatePhone(values.phone)) errors.phone = "Ingresa un teléfono válido (solo números)"
  if (!values.address.trim()) errors.address = "La dirección es requerida"
  if (!values.city.trim()) errors.city = "La ciudad es requerida"
  if (!values.department) errors.department = "El departamento es requerido"
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
  // Asocia label ↔ control y anuncia el error a lectores de pantalla
  const id = useId()
  const errorId = `${id}-error`
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })
    : children

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-montserrat font-medium text-[#4A4A4A] uppercase tracking-wide mb-1"
      >
        {label}
        {required && <span className="text-[#E31C23] ml-0.5">*</span>}
      </label>
      {control}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-[#E31C23] font-montserrat">
          {error}
        </p>
      )}
    </div>
  )
}

// 16 px de texto: con menos, iOS hace zoom al enfocar el campo y desacomoda el formulario.
const inputClass =
  "w-full min-h-12 border border-[#E0E0E0] rounded-[var(--store-radius-md)] px-3.5 py-3 text-base font-montserrat text-[#1C1C1C] placeholder-[#9E9E9E] bg-white focus:outline-none focus:border-[#1C1C1C] focus:ring-2 focus:ring-[#1C1C1C]/10 transition-colors"
const inputErrorClass =
  "w-full min-h-12 border border-[#E31C23] rounded-[var(--store-radius-md)] px-3.5 py-3 text-base font-montserrat text-[#1C1C1C] placeholder-[#9E9E9E] bg-white focus:outline-none focus:border-[#E31C23] focus:ring-2 focus:ring-[#E31C23]/15 transition-colors"

const sectionClass = "rounded-[var(--store-radius-lg)] border border-[#ECECEA] bg-white p-5 sm:p-6"

function SectionTitle({ step, children, aside }: { step: number; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 font-barlow text-base font-bold uppercase tracking-[0.08em] text-[#1C1C1C]">
        <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-[#1C1C1C] font-barlow text-xs text-white">{step}</span>
        {children}
      </h2>
      {aside}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { data: session, isPending } = useSession()
  const [requiresAuth, setRequiresAuth] = useState(false)
  const [draftPersistenceFailed, setDraftPersistenceFailed] = useState(false)
  const canCreateOrder = session?.user?.userType === "customer"

  if (requiresAuth && !canCreateOrder) {
    return <CheckoutAuthGate draftPersistenceFailed={draftPersistenceFailed} />
  }

  return (
    <CheckoutForm
      canCreateOrder={canCreateOrder}
      isSessionPending={isPending}
      sessionEmail={canCreateOrder ? session.user.email : null}
      onAuthRequired={(draftSaved) => {
        setDraftPersistenceFailed(!draftSaved)
        setRequiresAuth(true)
      }}
    />
  )
}

interface CheckoutFormProps {
  canCreateOrder: boolean
  isSessionPending: boolean
  sessionEmail: string | null
  onAuthRequired: (draftSaved: boolean) => void
}

function CheckoutForm({
  canCreateOrder,
  isSessionPending,
  sessionEmail,
  onAuthRequired,
}: CheckoutFormProps) {
  const { items, subtotal } = useCart()
  const shippingRates = useShippingRates()
  const deliveryDays = useDeliveryDays()
  const hasEditedForm = useRef(false)

  // InitiateCheckout una sola vez por visita al checkout, con el carrito inicial.
  const hasTrackedCheckout = useRef(false)
  useEffect(() => {
    if (hasTrackedCheckout.current || items.length === 0) return
    hasTrackedCheckout.current = true
    trackMetaEvent("InitiateCheckout", buildMetaCommerceParams(items))
  }, [items])

  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  /** Cuando está definido el pedido ya fue creado; mostramos el botón de pago */
  const [epaycoData, setEpaycoData] = useState<EpaycoCheckoutData | null>(null)
  /** Cupón validado en servidor; placeOrder lo revalida y recalcula el descuento */
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

  const [values, setValues] = useState<FormValues>(INITIAL_FORM_VALUES)

  useEffect(() => {
    if (!canCreateOrder || !sessionEmail) return

    const storage = getCheckoutSessionStorage()
    const draft = loadCheckoutDraft(storage, sessionEmail)
    if (!draft) return
    clearCheckoutDraft(storage)

    let cancelled = false
    const restoreDraft = async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      if (cancelled) return

      if (!hasEditedForm.current) setValues(draft.form)
      if (!draft.couponCode) return

      const currentCart = useCartStore.getState()
      if (currentCart.subtotal <= 0 || currentCart.items.length === 0) return

      const couponResult = await validateCouponAction(
        draft.couponCode,
        currentCart.items.map((i) => ({ variantId: i.id, quantity: i.quantity }))
      )
      if (cancelled) return
      if (couponResult.valid && couponResult.code && couponResult.discountAmount !== undefined) {
        setAppliedCoupon({
          code: couponResult.code,
          discountAmount: couponResult.discountAmount,
        })
      } else {
        setServerError("El cupón guardado ya no está disponible y no fue aplicado.")
      }
    }

    void restoreDraft()
    return () => {
      cancelled = true
    }
  }, [canCreateOrder, sessionEmail])

  // Un carrito solo de tarjetas de regalo se entrega por correo: sin envío.
  const digitalOnly = items.length > 0 && items.every((item) => item.kind === "gift_card")
  const shippingCost = getShippingCost(values.shippingMethod, subtotal, { digitalOnly, rates: shippingRates })
  const discount = appliedCoupon?.discountAmount ?? 0
  const total = subtotal - discount + shippingCost

  // Captura del carrito abandonado: cuando hay email válido e ítems, se guarda
  // (con debounce) para que el admin pueda recuperarlo si la compra no se
  // completa. Al crear el pedido, el servidor lo marca como recuperado.
  const email = values.email
  useEffect(() => {
    if (epaycoData || items.length === 0 || !validateEmail(email)) return
    const timer = setTimeout(() => {
      void captureAbandonedCartAction({
        email: email.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.id,
          name: item.name,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
          imageUrl: item.imageUrl ?? null,
        })),
      })
    }, 2500)
    return () => clearTimeout(timer)
  }, [email, items, epaycoData])

  const set = useCallback(<K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    hasEditedForm.current = true
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError("")

    if (isSessionPending) return
    if (!canCreateOrder) {
      const draftSaved = saveCheckoutDraft(getCheckoutSessionStorage(), {
        form: values,
        couponCode: appliedCoupon?.code ?? null,
      })
      onAuthRequired(draftSaved)
      document.getElementById("public-scroll")?.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    const validationErrors = validateForm(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      const firstErrorKey = Object.keys(validationErrors)[0]
      document.querySelector(`[data-field="${firstErrorKey}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      return
    }

    if (items.length === 0) {
      setServerError("Tu bolsa está vacía")
      return
    }

    setSubmitting(true)

    const result = await createOrder({
      email: values.email,
      documentType: values.documentType ?? "CC",
      cedula: values.cedula,
      name: values.name,
      lastName: values.lastName,
      phone: values.phone,
      address: values.address,
      apartment: values.apartment || undefined,
      city: values.city,
      department: values.department,
      postalCode: values.postalCode || undefined,
      shippingMethod: values.shippingMethod,
      paymentMethod: "epayco",
      couponCode: appliedCoupon?.code,
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

    if (result.success && result.epaycoData) {
      // Pedido creado — pasamos al paso de pago
      clearCheckoutDraft(getCheckoutSessionStorage())
      setEpaycoData(result.epaycoData)
      document.getElementById("public-scroll")?.scrollTo({ top: 0, behavior: "smooth" })
    } else if (result.code === "AUTH_REQUIRED") {
      const draftSaved = saveCheckoutDraft(getCheckoutSessionStorage(), {
        form: values,
        couponCode: appliedCoupon?.code ?? null,
      })
      onAuthRequired(draftSaved)
      document.getElementById("public-scroll")?.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      setServerError(result.error ?? "Error al procesar el pedido")
    }
  }

  // ── Paso 2: pantalla de pago ─────────────────────────────────────────────
  if (epaycoData) {
    return (
      <div className="bg-[#F5F5F5] min-h-screen">
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <Link href="/" className="font-barlow font-bold text-2xl text-[#1C1C1C] tracking-tight">
            ONE STAR
          </Link>
          <div className="mb-8"><CheckoutStepper currentStep={3} /></div>

          <div className="bg-white rounded-xl p-8 mt-6 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-barlow font-bold text-xl text-[#1C1C1C] uppercase tracking-wide mb-1">
              Pedido creado
            </h2>
            <p className="font-montserrat text-sm text-[#4A4A4A] mb-1">
              Pedido <span className="font-bold text-[#1C1C1C]">
                #{epaycoData.orderId.slice(-8).toUpperCase()}
              </span>
            </p>
            <p className="font-montserrat text-sm text-[#4A4A4A] mb-6">
              Total a pagar:{" "}
              <span className="font-bold text-[#1C1C1C]">{formatCOP(epaycoData.amount)}</span>
            </p>

            <p className="font-montserrat text-xs text-[#4A4A4A] mb-4">
              Haz clic en el botón para completar tu pago de forma segura con ePayco.
              Podrás pagar con tarjeta crédito/débito, PSE o efectivo.
            </p>

            <EpaycoButton {...epaycoData} />

            <button
              onClick={() => setEpaycoData(null)}
              className="mt-4 w-full text-center border border-[#E0E0E0] text-[#4A4A4A] font-montserrat text-sm py-2.5 rounded hover:border-[#1C1C1C] transition-colors"
            >
              ← Volver y modificar datos
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Paso 1: formulario ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--store-canvas)]">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 lg:pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-barlow text-3xl font-extrabold uppercase tracking-[-0.02em] text-[#1C1C1C] sm:text-4xl">Finalizar compra</h1>
            <p className="mt-1 font-montserrat text-sm text-[#4A4A4A]">Revisa tus datos; el pago se hace en el portal seguro de ePayco.</p>
          </div>
          <CheckoutStepper currentStep={2} />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* minmax(0, …) evita que las columnas desborden; en móvil el resumen va primero y plegable. */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
            {/* ── LEFT: Form ── */}
            <div className="order-2 w-full space-y-4 lg:order-1">

              {/* Section 1: Contacto */}
              <motion.section className={sectionClass} variants={sectionVariants} initial="hidden" animate="visible" custom={0}>
                <SectionTitle step={1}>Contacto</SectionTitle>
                <div className="space-y-4">
                  <div data-field="email">
                    <Field label="Email" required error={errors.email}>
                      <input type="email" value={values.email} onChange={(e) => set("email", e.target.value)}
                        placeholder="hola@ejemplo.com" className={errors.email ? inputErrorClass : inputClass} autoComplete="email" />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={values.newsletter} onChange={(e) => set("newsletter", e.target.checked)}
                      className="h-12 w-12 shrink-0 rounded border-[#E0E0E0] accent-[#E31C23]" />
                    <span className="text-sm font-montserrat text-[#4A4A4A]">Recibir novedades y ofertas</span>
                  </label>
                </div>
              </motion.section>

              {/* Section 2: Dirección de envío */}
              <motion.section className={sectionClass} variants={sectionVariants} initial="hidden" animate="visible" custom={1}>
                <SectionTitle step={2}>Dirección de envío</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div data-field="name">
                    <Field label="Nombre" required error={errors.name}>
                      <input type="text" value={values.name} onChange={(e) => set("name", e.target.value)}
                        placeholder="Juan" className={errors.name ? inputErrorClass : inputClass} autoComplete="given-name" />
                    </Field>
                  </div>
                  <div data-field="lastName">
                    <Field label="Apellido" required error={errors.lastName}>
                      <input type="text" value={values.lastName} onChange={(e) => set("lastName", e.target.value)}
                        placeholder="Pérez" className={errors.lastName ? inputErrorClass : inputClass} autoComplete="family-name" />
                    </Field>
                  </div>
                  <div data-field="cedula">
                    <Field label="Documento (Facturación)" required error={errors.cedula}>
                      <div className="flex gap-2">
                        <select
                          value={values.documentType ?? "CC"}
                          onChange={(e) => set("documentType", e.target.value as FormValues["documentType"])}
                          className={`w-28 shrink-0 ${errors.cedula ? inputErrorClass : inputClass} cursor-pointer`}
                          aria-label="Tipo de documento"
                        >
                          <option value="CC">CC</option>
                          <option value="CE">CE</option>
                          <option value="NIT">NIT</option>
                          <option value="PP">PP</option>
                        </select>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={values.cedula}
                          onChange={(e) => set("cedula", e.target.value.replace(/\D/g, ""))}
                          placeholder="Número de documento"
                          className={errors.cedula ? inputErrorClass : inputClass}
                          autoComplete="off"
                        />
                      </div>
                    </Field>
                  </div>
                  <div data-field="phone">
                    <Field label="Teléfono" required error={errors.phone}>
                      <input type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)}
                        placeholder="3001234567" className={errors.phone ? inputErrorClass : inputClass} autoComplete="tel" />
                    </Field>
                  </div>
                  <div data-field="address" className="sm:col-span-2">
                    <Field label="Dirección" required error={errors.address}>
                      <input type="text" value={values.address} onChange={(e) => set("address", e.target.value)}
                        placeholder="Calle 123 #45-67" className={errors.address ? inputErrorClass : inputClass} autoComplete="street-address" />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Apartamento / Casa / Oficina">
                      <input type="text" value={values.apartment} onChange={(e) => set("apartment", e.target.value)}
                        placeholder="Apto 301 (opcional)" className={inputClass} />
                    </Field>
                  </div>
                  <div data-field="city">
                    <Field label="Ciudad" required error={errors.city}>
                      <input type="text" value={values.city} onChange={(e) => set("city", e.target.value)}
                        placeholder="Medellín" className={errors.city ? inputErrorClass : inputClass} autoComplete="address-level2" />
                    </Field>
                  </div>
                  <div data-field="department">
                    <Field label="Departamento" required error={errors.department}>
                      <select value={values.department} onChange={(e) => set("department", e.target.value)}
                        className={`${errors.department ? inputErrorClass : inputClass} cursor-pointer`}>
                        <option value="">Seleccionar...</option>
                        {COLOMBIA_DEPARTMENTS.map((dep) => (
                          <option key={dep} value={dep}>{dep}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Código postal">
                      <input type="text" value={values.postalCode} onChange={(e) => set("postalCode", e.target.value)}
                        placeholder="110111 (opcional)" className={inputClass} autoComplete="postal-code" />
                    </Field>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input type="checkbox" checked={values.saveAddress} onChange={(e) => set("saveAddress", e.target.checked)}
                    className="h-12 w-12 shrink-0 rounded border-[#E0E0E0] accent-[#E31C23]" />
                  <span className="text-sm font-montserrat text-[#4A4A4A]">Guardar esta dirección para futuras compras</span>
                </label>
              </motion.section>

              {/* Section 3: Método de envío */}
              <motion.section className={sectionClass} variants={sectionVariants} initial="hidden" animate="visible" custom={2}>
                <SectionTitle step={3}>Método de envío</SectionTitle>
                {digitalOnly ? (
                  <div className="flex items-center justify-between p-4 rounded-lg border border-[#1C1C1C] bg-[#F5F5F5]">
                    <div>
                      <p className="text-sm font-montserrat font-medium text-[#1C1C1C]">Entrega digital</p>
                      <p className="text-xs text-[#4A4A4A] font-montserrat mt-0.5">
                        La tarjeta de regalo llega por correo electrónico después del pago.
                      </p>
                    </div>
                    <span className="text-sm font-montserrat font-medium text-green-600">Sin costo</span>
                  </div>
                ) : (
                <div className="space-y-3">
                  <label className={`flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-[var(--store-radius-md)] border p-4 transition-[border-color,box-shadow] ${
                    values.shippingMethod === "standard" ? "border-[#1C1C1C] shadow-[0_0_0_1px_#1C1C1C]" : "border-[#E0E0E0] hover:border-[#4A4A4A]"}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="shippingMethod" value="standard" checked={values.shippingMethod === "standard"}
                        onChange={() => set("shippingMethod", "standard")} className="h-12 w-12 shrink-0 accent-[#E31C23]" />
                      <div>
                        <p className="text-sm font-montserrat font-medium text-[#1C1C1C]">Envío estándar ({deliveryDays.min}-{deliveryDays.max} días hábiles)</p>
                        {subtotal >= shippingRates.freeThreshold ? (
                          <p className="text-xs text-green-600 font-montserrat mt-0.5">
                            ¡Envío gratis por compras mayores a {formatCOP(shippingRates.freeThreshold)}!
                          </p>
                        ) : (
                          <p className="mt-0.5 font-montserrat text-xs text-[#4A4A4A]">
                            Agrega {formatCOP(shippingRates.freeThreshold - subtotal)} más y es gratis
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-montserrat font-medium text-[#1C1C1C]">
                      {subtotal >= shippingRates.freeThreshold
                        ? <span className="text-green-600">Gratis</span>
                        : formatCOP(shippingRates.standardCost)}
                    </span>
                  </label>

                  <label className={`flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-[var(--store-radius-md)] border p-4 transition-[border-color,box-shadow] ${
                    values.shippingMethod === "express" ? "border-[#1C1C1C] shadow-[0_0_0_1px_#1C1C1C]" : "border-[#E0E0E0] hover:border-[#4A4A4A]"}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="shippingMethod" value="express" checked={values.shippingMethod === "express"}
                        onChange={() => set("shippingMethod", "express")} className="h-12 w-12 shrink-0 accent-[#E31C23]" />
                      <p className="text-sm font-montserrat font-medium text-[#1C1C1C]">Envío express ({deliveryDays.expressMin}-{deliveryDays.expressMax} días hábiles)</p>
                    </div>
                    <span className="text-sm font-montserrat font-medium text-[#1C1C1C]">{formatCOP(shippingRates.expressCost)}</span>
                  </label>
                </div>
                )}
              </motion.section>

              {/* Section 4: Pago — solo info, el pago ocurre en paso 2 */}
              <motion.section className={sectionClass} variants={sectionVariants} initial="hidden" animate="visible" custom={3}>
                <SectionTitle step={4} aside={<span className="flex items-center gap-1 text-xs font-montserrat text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Pago 100% seguro
                  </span>}>Pago</SectionTitle>
                <div className="bg-[#F5F5F5] rounded-lg p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E31C23]/10 flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E31C23" strokeWidth="2" strokeLinecap="round">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-montserrat font-semibold text-sm text-[#1C1C1C]">ePayco</p>
                    <p className="font-montserrat text-xs text-[#4A4A4A]">
                      Tarjeta crédito/débito · PSE · Efectivo
                    </p>
                  </div>
                </div>
                <p className="font-montserrat text-xs text-[#4A4A4A] mt-3">
                  Al confirmar tus datos se abrirá el portal seguro de ePayco para completar el pago.
                </p>
              </motion.section>

              {serverError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-montserrat text-[#E31C23]">{serverError}</p>
                </div>
              )}

              {/* En móvil el botón queda fijo abajo: el total y la acción siempre a la vista. */}
              <div className="sticky bottom-0 z-10 -mx-4 border-t border-[#ECECEA] bg-[var(--store-canvas)]/95 px-4 pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
              <button
                type="submit"
                disabled={submitting || isSessionPending}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[var(--store-radius-md)] bg-[#E31C23] font-barlow text-base font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#c21920] disabled:bg-[#4A4A4A]"
              >
                {submitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Procesando...
                  </>
                ) : isSessionPending ? (
                  "Verificando sesión..."
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    Confirmar datos — {formatCOP(total)}
                  </>
                )}
              </button>
              </div>

              <p className="text-center text-xs font-montserrat text-[#4A4A4A]">
                Al confirmar aceptas nuestros{" "}
                <Link href="/terminos" className="underline hover:text-[#1C1C1C]">
                  Términos y condiciones
                </Link>
                .
              </p>
            </div>

            {/* ── RIGHT: Order Summary ── */}
            <div className="order-1 w-full lg:sticky lg:top-28 lg:order-2">
              <OrderSummary
                shippingCost={shippingCost}
                appliedCoupon={appliedCoupon}
                onCouponChange={setAppliedCoupon}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
