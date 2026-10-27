import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import { getProducts } from "./product.service"
import { findVariantForCartDisplay } from "@/server/repositories/variant.repository"
import { buildStoreKnowledge, STORE_KNOWLEDGE } from "@/lib/store-knowledge"
import { getDeliveryWindow, getShippingRates } from "@/server/services/store-settings.service"

const DEFAULT_MODEL = "claude-3-5-haiku-latest"
const MAX_TOOL_ROUNDS = 4

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface CartAction {
  type: "add_to_cart"
  variantId: string
  productId: string
  sku: string
  name: string
  slug: string
  brand: string | null
  imageUrl: string | null
  size: string
  color: string
  price: number
  quantity: number
}

export interface ChatResult {
  reply: string
  actions: CartAction[]
}

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

function systemPrompt(knowledge: string) {
  return `Eres el asesor de compras virtual exclusivo de One Star, tienda colombiana especializada en ropa y calzado deportivo y urbano premium (Nike, New Balance, Veja, Hoka, Vans, Converse, Skechers, Asics, Adidas).

Tu único objetivo es guiar al cliente hacia la compra informada de productos de nuestra tienda.

Reglas estrictas de interacción:
1. Enfoque exclusivo en ventas de One Star: responde únicamente consultas sobre nuestro catálogo de tenis y ropa, recomendaciones de modelos por uso (running, urbano, confort, gimnasio, estilo), elección de tallas, tiendas físicas, envíos, métodos de pago y asistencia para comprar.
2. Cero temas fuera de lugar: si el usuario intenta hacer preguntas ajenas (tareas escolares, programación, política, chistes, recetas, cultura general o cualquier tema no relacionado con One Star o calzado), rechaza con amabilidad y firmeza: "Soy el asesor comercial de One Star. Con gusto puedo ayudarte a elegir tus próximos tenis, consultar disponibilidad de tallas o resolver dudas sobre tu compra en nuestra tienda. ¿Qué tipo de calzado estás buscando hoy?".
3. Precios y stock reales: SIEMPRE usa las herramientas para verificar precio y stock antes de afirmar disponibilidad. Nunca inventes precios, referencias o promociones.
4. Si un producto no tiene stock, dilo con honestidad y ofrece buscar un modelo alternativo del catálogo.
5. Moneda y formato: los precios están en pesos colombianos (COP).
6. Concisión y tono: sé cordial, directo y breve. No uses respuestas innecesariamente largas para agilizar la atención.
7. Al agregar al carrito: confirma la talla y color agregados e invita cordialmente al cliente a abrir el carrito o proceder al checkout.
8. Políticas y tiendas: para envíos, pagos, cambios, devoluciones, garantías, tiendas físicas y horarios, básate exclusivamente en la base de conocimiento oficial de abajo.

BASE DE CONOCIMIENTO DE ONE STAR
${knowledge}`
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_productos",
    description:
      "Busca en el catálogo publicado de One Star por nombre, marca o tipo de producto. Devuelve precio y, por cada variante (talla+color), su stock real.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto de búsqueda, ej: 'Nike Pegasus' o 'tenis running hombre'" },
      },
      required: ["query"],
    },
  },
  {
    name: "agregar_al_carrito",
    description:
      "Agrega una variante (talla+color) específica al carrito del visitante. Usa el variantId que devolvió buscar_productos. Antes de llamarla, confirma con el cliente la talla/color exactos si hay duda.",
    input_schema: {
      type: "object",
      properties: {
        variantId: { type: "string" },
        quantity: { type: "number", description: "Cantidad a agregar, normalmente 1" },
      },
      required: ["variantId"],
    },
  },
]

async function runBuscarProductos(query: string) {
  const { products } = await getProducts({ q: query }, 5)
  return products.map((p) => ({
    productId: p.id,
    name: p.name,
    brand: p.brand,
    price: p.isOnSale && p.salePrice !== null ? p.salePrice : p.basePrice,
    enOferta: p.isOnSale,
    variantes: p.variants.map((v) => ({
      variantId: v.id,
      talla: v.size,
      color: v.color,
      stock: v.stock,
    })),
  }))
}

async function runAgregarAlCarrito(
  variantId: string,
  quantity: number
): Promise<{ result: Record<string, unknown>; action?: CartAction }> {
  const qty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1
  const variant = await findVariantForCartDisplay(variantId)

  if (!variant || !variant.product.isPublished || !variant.product.availableOnline) {
    return { result: { ok: false, error: "Ese producto ya no está disponible." } }
  }
  if (variant.stock < qty) {
    return {
      result: {
        ok: false,
        error: `Solo quedan ${variant.stock} unidad(es) disponibles de esa talla/color.`,
      },
    }
  }

  const price =
    variant.product.isOnSale && variant.product.salePrice !== null
      ? variant.product.salePrice.toNumber()
      : variant.product.basePrice.toNumber()

  const action: CartAction = {
    type: "add_to_cart",
    variantId: variant.id,
    productId: variant.product.id,
    sku: variant.sku,
    name: variant.product.name,
    slug: variant.product.slug,
    brand: variant.product.brand?.name ?? null,
    imageUrl: variant.product.images[0]?.url ?? null,
    size: variant.size,
    color: variant.color,
    price,
    quantity: qty,
  }

  return { result: { ok: true, agregado: action.name, talla: action.size, color: action.color, cantidad: qty }, action }
}

async function runTool(name: string, input: Record<string, unknown>): Promise<{ result: unknown; action?: CartAction }> {
  if (name === "buscar_productos") {
    return { result: await runBuscarProductos(String(input.query ?? "")) }
  }
  if (name === "agregar_al_carrito") {
    return runAgregarAlCarrito(String(input.variantId ?? ""), Number(input.quantity ?? 1))
  }
  return { result: { ok: false, error: "Herramienta desconocida." } }
}

/**
 * Sin ANTHROPIC_API_KEY configurada, el chat se degrada con un mensaje claro
 * en vez de romper la página — mismo patrón ya usado para Resend/ePayco.
 */
export async function sendChatMessage(history: ChatMessage[], message: string): Promise<ChatResult> {
  const client = getClient()
  if (!client) {
    return {
      reply: "El asistente de compras todavía no está disponible. Vuelve pronto — mientras tanto puedes explorar el catálogo normalmente.",
      actions: [],
    }
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
  const knowledge = await Promise.all([getShippingRates(), getDeliveryWindow()])
    .then(([rates, delivery]) => buildStoreKnowledge(rates, delivery))
    .catch(() => STORE_KNOWLEDGE)
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: "user", content: message },
  ]

  const actions: CartAction[] = []

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt(knowledge),
        tools: TOOLS,
        messages,
      })

      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      )

      if (toolUses.length === 0) {
        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n")
          .trim()
        return { reply: text || "No tengo una respuesta clara para eso, ¿puedes contarme un poco más?", actions }
      }

      messages.push({ role: "assistant", content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUses) {
        const { result, action } = await runTool(toolUse.name, (toolUse.input as Record<string, unknown>) ?? {})
        if (action) actions.push(action)
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        })
      }
      messages.push({ role: "user", content: toolResults })
    }

    return {
      reply: "Se me complicó terminar de resolver tu pedido — ¿puedes reformularlo o ser más específico?",
      actions,
    }
  } catch (err) {
    console.error("[ai-chat] Error consultando el modelo de IA:", err)
    return {
      reply: "Tuve un problema para responder justo ahora. Intenta de nuevo en un momento.",
      actions,
    }
  }
}
