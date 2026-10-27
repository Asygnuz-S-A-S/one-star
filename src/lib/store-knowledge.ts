import { DEFAULT_SHIPPING_RATES, type ShippingRates } from "./shipping"

/**
 * Base de conocimiento de One Star para el chat de ventas de la web.
 * Fuente: respuestas de One Star del 20 oct 2026 (envíos, pagos, cambios, reclamos, tiendas y horario)
 * y la misma base que usa el asistente de WhatsApp. Los valores de envío salen de `shipping.ts`
 * para que el chat nunca diga algo distinto a lo que cobra el checkout.
 * Si One Star cambia una política, se actualiza aquí y en la base del asistente de WhatsApp.
 */

const cop = (value: number) => `$${value.toLocaleString("es-CO")}`

export function buildStoreKnowledge(
  rates: ShippingRates = DEFAULT_SHIPPING_RATES,
  delivery: { min: number; max: number } = { min: 3, max: 5 },
): string {
  return `ENVÍOS
- Transportadora: Envía es el aliado logístico de One Star.
- Cobertura: nacional en la mayoría de municipios de primera y segunda categoría. En municipios de tercera categoría en adelante, el costo y la cobertura pueden variar: el valor exacto se ve en el checkout con la dirección.
- Envío estándar: ${cop(rates.standardCost)}. Es gratis en compras desde ${cop(rates.freeThreshold)}.
- Envío express: ${cop(rates.expressCost)}.
- Tiempo de entrega estimado: ${delivery.min} a ${delivery.max} días hábiles, contados desde la confirmación del pago. El costo y el tiempo exactos se muestran en el checkout antes de pagar.
- Las tarjetas de regalo son digitales y no tienen envío.

PAGOS
- El pago se hace en el checkout de la tienda, con la pasarela ePayco.
- Medios de pago de contado: tarjetas de crédito y débito, PSE, Efecty, Baloto y otros medios incluidos en ePayco. Si preguntan por un medio que no está en esta lista (por ejemplo Nequi o Daviplata), no lo confirmes: los medios disponibles se ven en el checkout.
- Pago contra entrega: por ahora no. One Star está trabajando para ofrecerlo pronto.
- Se puede comprar como invitado, sin crear cuenta.

CAMBIOS, DEVOLUCIONES Y GARANTÍA
- Cambios: 30 días calendario cuando el producto no es lo que el cliente buscaba o no es su talla. En productos en oferta, el plazo es de 10 días calendario.
- Cambios por talla: sujetos a disponibilidad de inventario y a que el producto no haya sido usado.
- Derecho de retracto (solo compras en línea): 5 días hábiles. Los costos de transporte del retracto los asume el cliente.
- Garantía legal por defectos de fabricación o de calidad, según el Estatuto del Consumidor. No cubre desgaste natural ni daños por uso indebido.
- Para un cambio, devolución, garantía o reclamo, el cliente escribe al correo contacto@tiendaonestar.com o al WhatsApp 313 762 0554, con su número de pedido.

TIENDAS FÍSICAS
- Manizales, C.C. Fundadores, local 158: lunes a sábado de 10:00 a. m. a 8:00 p. m.; domingos y festivos de 11:00 a. m. a 8:00 p. m.
- Manizales, Pasaje Los Agustinos, local 5 (Outlet): lunes a sábado de 9:00 a. m. a 7:00 p. m.
- Pereira, C.C. Unicentro, local C-45: lunes a domingo de 10:00 a. m. a 8:00 p. m.
- El inventario de la tienda en línea no es el de cada tienda física: no afirmes que un producto está en una sede.

ATENCIÓN HUMANA
- Una asesora atiende por WhatsApp (313 762 0554) de lunes a sábado, de 9:00 a. m. a 7:00 p. m.

TALLAS
- Las tallas del catálogo están en sistema US. Cada producto tiene su guía de tallas en la ficha ("Guía de tallas"). No conviertas tallas de memoria.`
}

/** Base con las tarifas de respaldo. El chat en vivo usa `buildStoreKnowledge` con Configuración. */
export const STORE_KNOWLEDGE = buildStoreKnowledge()
