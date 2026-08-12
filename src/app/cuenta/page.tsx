"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { updateProfile } from "./actions"
import { formatDateLong, formatCurrency } from "@/lib/dates"

type Tab = "perfil" | "pedidos" | "direcciones" | "salir"

interface Order {
  id: string
  status: string
  total: string | number
  createdAt: string
  items: {
    id: string
    quantity: number
    unitPrice: string | number
    product: {
      id: string
      name: string
      slug: string
      images: { url: string; alt: string }[]
    }
  }[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Pagado", color: "bg-blue-100 text-blue-800" },
  SHIPPED: { label: "Enviado", color: "bg-indigo-100 text-indigo-800" },
  DELIVERED: { label: "Entregado", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800" },
}

function OrderStatusBadge({ status }: { status: string }) {
  const { label, color } = STATUS_LABELS[status] ?? {
    label: status,
    color: "bg-gray-100 text-gray-800",
  }
  return (
    <span className={`px-2.5 py-0.5 rounded-full font-montserrat text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

export default function CuentaPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("perfil")

  // Profile edit state
  const [editing, setEditing] = useState(false)
  const [profileName, setProfileName] = useState("")
  const [profileLastName, setProfileLastName] = useState("")
  const [profilePhone, setProfilePhone] = useState("")
  const [profileBrand, setProfileBrand] = useState("")
  const [profileGender, setProfileGender] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState(false)

  // Orders state
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Redirect if not authenticated (wait until session is resolved)
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login?callbackUrl=/cuenta")
    }
  }, [isPending, session, router])

  // Load orders when tab changes
  useEffect(() => {
    if (activeTab === "pedidos" && orders.length === 0) {
      setOrdersLoading(true)
      fetch("/api/cuenta/pedidos")
        .then((r) => r.json())
        .then((data: { orders: Order[] }) => setOrders(data.orders ?? []))
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false))
    }
  }, [activeTab, orders.length])

  if (isPending) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <p className="font-montserrat text-sm text-[#4A4A4A]">Cargando...</p>
      </main>
    )
  }

  if (!session) return null

  const user = session.user

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileError("")
    setProfileSuccess(false)

    const result = await updateProfile({
      name: profileName,
      lastName: profileLastName,
      phone: profilePhone,
      preferredBrand: profileBrand,
      gender: profileGender,
    })

    setProfileSaving(false)

    if (!result.success) {
      setProfileError(result.error ?? "Error al guardar.")
      return
    }

    setProfileSuccess(true)
    setEditing(false)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "perfil", label: "Mi perfil" },
    { id: "pedidos", label: "Mis pedidos" },
    { id: "direcciones", label: "Mis direcciones" },
    { id: "salir", label: "Cerrar sesión" },
  ]

  return (
    <main className="min-h-screen bg-[#F5F5F5] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Page title */}
        <h1 className="font-barlow font-bold text-2xl text-[#1C1C1C] uppercase tracking-wide mb-6">
          Mi cuenta
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "salir") {
                  void signOut({ fetchOptions: { onSuccess: () => router.push("/") } })
                  return
                }
                setActiveTab(tab.id)
              }}
              className={[
                "flex-1 whitespace-nowrap px-4 py-2.5 rounded-lg font-montserrat text-sm font-medium transition-colors",
                activeTab === tab.id && tab.id !== "salir"
                  ? "bg-[#E31C23] text-white"
                  : tab.id === "salir"
                  ? "text-[#E31C23] hover:bg-red-50"
                  : "text-[#4A4A4A] hover:bg-[#F5F5F5]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Mi perfil */}
        {activeTab === "perfil" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-barlow font-bold text-lg text-[#1C1C1C] uppercase">Mi perfil</h2>
              {!editing && (
                <button
                  onClick={() => {
                    setEditing(true)
                    setProfileName(user.name ?? "")
                    setProfileSuccess(false)
                  }}
                  className="font-montserrat text-sm text-[#E31C23] font-semibold hover:underline"
                >
                  Editar perfil
                </button>
              )}
            </div>

            {profileSuccess && (
              <p className="font-montserrat text-xs text-green-700 bg-green-50 rounded-lg px-4 py-2 mb-4">
                Perfil actualizado correctamente.
              </p>
            )}

            {!editing ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="font-montserrat text-xs text-[#4A4A4A] uppercase tracking-wide">Nombre</dt>
                  <dd className="font-montserrat text-sm text-[#1C1C1C] mt-1">{user.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-montserrat text-xs text-[#4A4A4A] uppercase tracking-wide">Correo electrónico</dt>
                  <dd className="font-montserrat text-sm text-[#1C1C1C] mt-1">{user.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-montserrat text-xs text-[#4A4A4A] uppercase tracking-wide">Teléfono</dt>
                  <dd className="font-montserrat text-sm text-[#1C1C1C] mt-1">{profilePhone || "—"}</dd>
                </div>
                <div>
                  <dt className="font-montserrat text-xs text-[#4A4A4A] uppercase tracking-wide">Marca favorita</dt>
                  <dd className="font-montserrat text-sm text-[#1C1C1C] mt-1">{profileBrand || "—"}</dd>
                </div>
              </dl>
            ) : (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="edit-name" className="font-montserrat text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">
                      Nombre
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="border border-[#E0E0E0] rounded-lg px-4 py-2.5 font-montserrat text-sm text-[#1C1C1C] focus:outline-none focus:border-[#E31C23] transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="edit-lastName" className="font-montserrat text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">
                      Apellido
                    </label>
                    <input
                      id="edit-lastName"
                      type="text"
                      value={profileLastName}
                      onChange={(e) => setProfileLastName(e.target.value)}
                      className="border border-[#E0E0E0] rounded-lg px-4 py-2.5 font-montserrat text-sm text-[#1C1C1C] focus:outline-none focus:border-[#E31C23] transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="edit-phone" className="font-montserrat text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">
                      Teléfono
                    </label>
                    <input
                      id="edit-phone"
                      type="tel"
                      inputMode="numeric"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="border border-[#E0E0E0] rounded-lg px-4 py-2.5 font-montserrat text-sm text-[#1C1C1C] focus:outline-none focus:border-[#E31C23] transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="edit-brand" className="font-montserrat text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">
                      Marca preferida
                    </label>
                    <select
                      id="edit-brand"
                      value={profileBrand}
                      onChange={(e) => setProfileBrand(e.target.value)}
                      className="border border-[#E0E0E0] rounded-lg px-4 py-2.5 font-montserrat text-sm text-[#1C1C1C] focus:outline-none focus:border-[#E31C23] transition-colors"
                    >
                      <option value="">Selecciona una marca</option>
                      {["Nike","New Balance","Hoka","Veja","On Running","Adidas","Asics","Sin preferencia"].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Género */}
                <div className="flex flex-col gap-2">
                  <span className="font-montserrat text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">Género</span>
                  <div className="flex gap-6">
                    {[{ value: "hombre", label: "Hombre" }, { value: "mujer", label: "Mujer" }].map((g) => (
                      <label key={g.value} className="flex items-center gap-2 cursor-pointer font-montserrat text-sm text-[#1C1C1C]">
                        <input
                          type="radio"
                          name="edit-gender"
                          value={g.value}
                          checked={profileGender === g.value}
                          onChange={() => setProfileGender(g.value)}
                          className="accent-[#E31C23]"
                        />
                        {g.label}
                      </label>
                    ))}
                  </div>
                </div>

                {profileError && (
                  <p className="font-montserrat text-xs text-[#E31C23]">{profileError}</p>
                )}

                <div className="flex gap-3 mt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="bg-[#E31C23] text-white font-barlow font-bold text-sm tracking-widest uppercase px-6 py-2.5 rounded-lg hover:bg-[#c41920] transition-colors disabled:opacity-60"
                  >
                    {profileSaving ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="border border-[#E0E0E0] text-[#4A4A4A] font-montserrat text-sm px-6 py-2.5 rounded-lg hover:border-[#1C1C1C] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab: Mis pedidos */}
        {activeTab === "pedidos" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-barlow font-bold text-lg text-[#1C1C1C] uppercase mb-6">Mis pedidos</h2>

            {ordersLoading ? (
              <p className="font-montserrat text-sm text-[#4A4A4A] text-center py-8">Cargando pedidos...</p>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <p className="font-montserrat text-sm text-[#4A4A4A]">Aún no has realizado pedidos.</p>
                <a
                  href="/"
                  className="bg-[#E31C23] text-white font-barlow font-bold text-sm tracking-widest uppercase px-6 py-2.5 rounded-lg hover:bg-[#c41920] transition-colors"
                >
                  Explorar productos
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {orders.map((order) => (
                  <div key={order.id} className="border border-[#E0E0E0] rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="font-montserrat text-xs text-[#4A4A4A]">
                        Pedido #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="font-montserrat text-xs text-[#4A4A4A]">
                        {formatDateLong(order.createdAt)}
                      </p>
                      <p className="font-barlow font-bold text-[#1C1C1C]">
                        {formatCurrency(Number(order.total))}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <OrderStatusBadge status={order.status} />
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="font-montserrat text-xs text-[#E31C23] font-semibold hover:underline"
                      >
                        Ver detalle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Mis direcciones */}
        {activeTab === "direcciones" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-barlow font-bold text-lg text-[#1C1C1C] uppercase mb-6">Mis direcciones</h2>
            <p className="font-montserrat text-sm text-[#4A4A4A] text-center py-8">
              Próximamente podrás guardar tus direcciones de envío.
            </p>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-barlow font-bold text-lg text-[#1C1C1C] uppercase">
                Pedido #{selectedOrder.id.slice(-8).toUpperCase()}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                aria-label="Cerrar"
                className="text-[#4A4A4A] hover:text-[#1C1C1C] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <OrderStatusBadge status={selectedOrder.status} />
              <span className="font-montserrat text-xs text-[#4A4A4A]">
                {formatDateLong(selectedOrder.createdAt)}
              </span>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.product.images[0] && (
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.images[0].alt}
                      className="w-14 h-14 object-cover rounded-lg bg-[#F5F5F5]"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-montserrat text-sm text-[#1C1C1C]">{item.product.name}</p>
                    <p className="font-montserrat text-xs text-[#4A4A4A]">
                      x{item.quantity} · {formatCurrency(Number(item.unitPrice))} c/u
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#E0E0E0] pt-3 flex items-center justify-between">
              <span className="font-montserrat text-sm text-[#4A4A4A]">Total</span>
              <span className="font-barlow font-bold text-[#1C1C1C]">
                {formatCurrency(Number(selectedOrder.total))}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
