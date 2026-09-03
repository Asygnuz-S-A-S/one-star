# Story 002 — Checkout Completo con Pasarela de Pago y Confirmación por Email

**Epic:** Epic 3 — Carrito y Checkout  
**Prioridad:** P0 (requerimiento de negocio crítico para lanzamiento)  
**Estado:** En progreso — `CheckoutStepper.tsx` y `actions.ts` existen, pago no integrado  
**Story points:** 13

---

## User Story

**Como** cliente autenticado que ha llenado su carrito,  
**quiero** completar el pago de forma segura con tarjeta o PSE y recibir confirmación inmediata,  
**para** tener la seguridad de que mi pedido fue procesado sin tener que llamar a la tienda.

---

## Contexto Técnico

El checkout ya tiene `CheckoutStepper.tsx` (UI), `OrderSummary.tsx`, y `src/app/checkout/actions.ts`. El modelo `Order` está completo con `OrderStatus` enum. Falta integrar la pasarela de pago (ePayco o MercadoPago) y el envío de email de confirmación.

**Decisión pendiente (ver `docs/architecture.md` P1):** Confirmar cuál pasarela usar. Esta story asume ePayco como primera opción pero la implementación debe ser intercambiable.

**Archivos relevantes:**
- `src/app/checkout/page.tsx` y `actions.ts`
- `src/components/checkout/CheckoutStepper.tsx`
- `src/components/checkout/OrderSummary.tsx`
- `src/server/services/order.service.ts`
- `src/server/repositories/order.repository.ts`
- `src/store/cart.store.ts`

---

## Criterios de Aceptación

### Flujo de checkout (≤ 3 pasos)

**Paso 1 — Datos de envío:**
- **Dado** que un visitante sin sesión intenta abrir el checkout,  
  **cuando** se resuelve su sesión,  
  **entonces** permanece en `/checkout` y puede revisar el resumen, diligenciar el formulario y aplicar un cupón sin crear todavía un pedido.
- Departamentos de Colombia prellenados desde `colombia-departments.ts`.
- **Dado** que el cliente está autenticado,  
  **cuando** llega al checkout,  
  **entonces** los campos se prellenan con sus datos de perfil (editables).

**Paso 2 — Revisión del pedido:**
- Muestra `OrderSummary` con productos, variantes, subtotal, descuento (cupón si aplica) y total.
- Campo para ingresar código de cupón con validación en tiempo real.

**Paso 3 — Pago:**
- Botón "Pagar con ePayco" (o MercadoPago) que inicia el flujo de la pasarela.
- Mientras espera respuesta, mostrar estado de "procesando pago".

### Integración de pasarela

- **Dado** que el usuario confirma el pago,  
  **cuando** la pasarela devuelve éxito (redirect o webhook),  
  **entonces** el `Order.status` cambia a `CONFIRMED`, el stock de cada variante se decrementa y se dispara el email de confirmación.
- **Dado** que el pago falla,  
  **cuando** llega la notificación de fallo,  
  **entonces** el pedido queda en `PAYMENT_FAILED` y el usuario ve el motivo con opción de reintentar.
- El webhook de confirmación valida la firma/hash de la pasarela antes de procesar.

### Email de confirmación

- El email usa plantilla HTML con: logo One Star (#E31C23), número de pedido, tabla de productos (nombre, talla, color, precio), total, dirección de envío, texto de próximos pasos.
- Se envía dentro de 2 minutos de la confirmación.
- El `From` es un dominio verificado (no genérico).

### Autenticación obligatoria en checkout

- Sólo una sesión de tipo `customer` puede confirmar el formulario y crear un pedido; visitantes y administradores pueden revisarlo, pero no enviarlo.
- Mientras se resuelve la sesión el formulario permanece visible y la confirmación está deshabilitada, sin asumir que la persona es anónima.
- Cuando una persona sin sesión `customer` pulsa el botón de confirmación, se muestra la silueta con opciones para iniciar sesión o registrarse.
- Login y registro conservan un `callbackUrl` interno seguro para regresar a `/checkout`.
- El borrador de contacto y envío se conserva temporalmente con caducidad, se vincula al email de la cuenta y se elimina al restaurarlo.
- La Server Action de creación de pedido rechaza llamadas anónimas y sesiones administrativas antes de invocar el servicio de pedidos.

---

## Tareas de Implementación

- [ ] Definir y documentar la pasarela seleccionada (ePayco vs MercadoPago) en `docs/architecture.md`
- [ ] Implementar `PaymentService` en `src/server/services/payment.service.ts` con método `createPaymentIntent` y `verifyWebhook`
- [ ] Crear webhook handler en `src/app/api/webhooks/payment/route.ts`
- [ ] Implementar `EmailService` en `src/server/services/email.service.ts` con plantilla de confirmación
- [ ] Actualizar `order.service.ts` para decrementar stock en variantes tras confirmación
- [ ] Conectar `CheckoutStepper` al flujo de pasarela (redirect o modal widget)
- [ ] Agregar validación de cupón en checkout step 2 vía `coupon.service.ts`
- [x] Solicitar autenticación al confirmar el checkout, conservar el borrador y mantener el retorno seguro entre login y registro
- [ ] Tests de integración en `order.service.ts` — flujo happy path y pago fallido

---

## Definición de Done

- [ ] Flujo completo funciona en móvil (Chrome/Safari iOS) con pasarela en sandbox
- [ ] Webhook valida firma y no procesa pagos duplicados (idempotencia)
- [ ] Email de confirmación llega con formato correcto en Gmail y Outlook
- [ ] Stock se decrementa correctamente tras pago exitoso
- [ ] Tests de `order.service.ts` con ≥ 80 % cobertura
- [ ] Variables de entorno de la pasarela documentadas en `docs/architecture.md`
- [ ] No se exponen claves privadas en el cliente (server-only)
- [x] No se crean pedidos sin una sesión de cliente autenticada
