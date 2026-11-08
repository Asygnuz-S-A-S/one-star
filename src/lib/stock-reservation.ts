/** Minutos que el checkout guarda las unidades de un pedido mientras el cliente empieza a pagar. Lo usan el servidor y el aviso del checkout. */
export const STOCK_RESERVATION_MINUTES = 15
/** Minutos desde la creación del pedido que se guardan las unidades cuando el cliente ya abrió la pasarela (ePayco o Addi). */
export const STOCK_RESERVATION_PAYMENT_MINUTES = 45
/** Horas máximas de una reserva con pago en curso: un pago que nunca se resuelve no puede retener unidades para siempre. */
export const STOCK_RESERVATION_MAX_HOURS = 24
