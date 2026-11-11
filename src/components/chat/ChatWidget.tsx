"use client"

import { useState, useRef, useEffect } from "react"
import { useCartStore } from "@/store"
import { sendChatMessageAction } from "@/server/actions/chat.actions"
import { DEFAULT_CHAT_WELCOME } from "@/lib/storefront-copy"
import ChatMarkdown from "./ChatMarkdown"

interface DisplayMessage {
  role: "user" | "assistant"
  content: string
}

export default function ChatWidget({ welcome = DEFAULT_CHAT_WELCOME }: { welcome?: string }) {
  const greeting: DisplayMessage = { role: "assistant", content: welcome }
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([greeting])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [hasCartActivity, setHasCartActivity] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const isCartOpen = useCartStore((s) => s.isOpen)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // En escritorio el cursor queda listo para escribir; en celular no, porque el teclado tapa las sugerencias.
  useEffect(() => {
    if (open && window.matchMedia("(min-width: 1024px)").matches) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  // El carrito (panel derecho, z-50) ocupa el mismo rincón que la burbuja del
  // chat (z-40) — se ocultan entre sí para no competir por el mismo espacio.
  if (isCartOpen) return null

  async function handleSend(preset?: string) {
    const text = (preset ?? input).trim()
    if (!text || sendingRef.current) return
    sendingRef.current = true
    setInput("")
    const nextMessages: DisplayMessage[] = [...messages, { role: "user", content: text }]
    setMessages(nextMessages)
    setLoading(true)

    const history = messages
      .slice(1)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const result = await sendChatMessageAction(history, text)

      if (result.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.error! }])
        return
      }

      if (result.actions.length > 0) setHasCartActivity(true)

      for (const action of result.actions) {
        if (action.type === "add_to_cart") {
          addItem({
            id: action.variantId,
            productId: action.productId,
            kind: "product",
            slug: action.slug,
            name: action.name,
            brand: action.brand,
            imageUrl: action.imageUrl,
            size: action.size,
            color: action.color,
            price: action.price,
            originalPrice: action.price,
            sku: action.sku,
            quantity: action.quantity,
            maxQuantity: action.maxQuantity,
          })
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }])
    } catch (err) {
      console.error("[ChatWidget] sendChatMessageAction falló:", err)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Tuve un problema para responder. Intenta de nuevo en un momento." },
      ])
    } finally {
      setLoading(false)
      sendingRef.current = false
    }
  }

  const suggestions = ["¿Qué talla soy?", "¿Cuánto cuesta el envío?", "¿Qué hay nuevo?", "Cambios y devoluciones"]

  return (
    <>
      {open && (
        // Celular: pantalla completa (por encima del aviso de cookies y de la barra inferior).
        // Escritorio: panel amplio en la esquina, encima del botón.
        <div
          role="dialog"
          aria-label="Asistente One Star"
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false) }}
          className="fixed inset-0 z-[60] flex flex-col bg-white lg:inset-auto lg:bottom-24 lg:right-6 lg:h-[min(40rem,calc(100dvh-8rem))] lg:w-[26rem] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-gray-200 lg:shadow-2xl"
          data-testid="chat-panel"
        >
          <div className="flex shrink-0 items-center gap-3 bg-[#1C1C1C] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-[#E31C23] text-white">
              <svg viewBox="0 0 100 95" className="h-4 w-4" fill="currentColor"><path d="M50 0l11.8 34.4H98L68.6 55.6 79.4 90 50 68.8 20.6 90l10.8-34.4L2 34.4h36.2z" /></svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-barlow text-base font-bold uppercase tracking-wide text-white">Asistente One Star</span>
              <span className="block text-xs text-white/60">Tallas, stock, envíos y compras</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-11 w-11 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar chat"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div ref={scrollRef} aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#F7F6F3] px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-md bg-[#E31C23] text-white"
                      : "rounded-bl-md bg-white text-[#1C1C1C] shadow-sm"
                  }`}
                >
                  {m.role === "user" ? m.content : <ChatMarkdown text={m.content} />}
                </div>
              </div>
            ))}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((q) => (
                  <button key={q} type="button" onClick={() => handleSend(q)} className="min-h-10 rounded-full border border-gray-300 bg-white px-3.5 text-sm text-[#1C1C1C] hover:border-[#1C1C1C]">
                    {q}
                  </button>
                ))}
              </div>
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 shadow-sm" aria-label="Escribiendo">
                  {[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 rounded-full bg-gray-400 motion-safe:animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />)}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); handleSend() }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta..."
                aria-label="Tu mensaje"
                ref={inputRef}
                enterKeyHint="send"
                maxLength={1000}
                // 16 px: con menos, el iPhone hace zoom al escribir.
                className="h-12 min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 text-base focus:border-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]/40"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#E31C23] text-white disabled:opacity-40"
                aria-label="Enviar"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </form>
            {hasCartActivity && (
              <button
                type="button"
                onClick={() => { setOpen(false); openCart() }}
                className="mt-2 min-h-11 w-full rounded-full border border-gray-300 text-sm font-semibold text-[#1C1C1C] hover:bg-gray-50"
              >
                Ver carrito
              </button>
            )}
          </div>
        </div>
      )}

      {/* Celular: abajo a la derecha, encima de la barra inferior. Escritorio: esquina inferior. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 place-items-center rounded-full bg-[#E31C23] text-white shadow-lg transition-transform hover:scale-105 lg:bottom-6 lg:right-6 ${open ? "hidden lg:grid" : "grid"}`}
        aria-label={open ? "Cerrar chat" : "Abrir chat de ventas"}
        aria-expanded={open}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-6l-4 4v-4z" />
          </svg>
        )}
      </button>
    </>
  )
}
