# Product Requirements Document — One Star E-Commerce

**Versión:** 1.0  
**Fecha:** 2026-06-09  
**Estado:** En desarrollo activo

---

## Resumen Ejecutivo

One Star necesita un e-commerce de calzado deportivo/lifestyle para el mercado colombiano, disponible en `tiendaonestar.com`. El 85 %+ del tráfico esperado es móvil. El sistema debe permitir operar el negocio digital de forma autónoma, con ≤ 3 clics hasta la compra y LCP < 2.5 s en dispositivos móviles.

---

## Epic 1 — Catálogo y Productos

### Descripción
El corazón del negocio. Permite a los compradores descubrir, filtrar y visualizar el catálogo de calzado.

### User Stories

#### US-1.1 — Navegación por categoría
**Como** comprador móvil,  
**quiero** acceder al catálogo desde el menú superior por categoría (Lanzamientos, Hombre, Mujer, Niños, SALE, Accesorios),  
**para** llegar rápido a los productos que me interesan.

**Criterios de aceptación:**
- **Dado** que el usuario está en cualquier página,  
  **cuando** toca una opción del menú,  
  **entonces** la grilla de productos carga en < 1 s mostrando solo los productos de esa categoría.
- **Dado** que el header es fijo,  
  **cuando** el usuario hace scroll,  
  **entonces** el menú permanece visible en la parte superior.

#### US-1.2 — Filtros y ordenamiento
**Como** comprador,  
**quiero** filtrar el catálogo por género, marca, precio, color y talla,  
**para** encontrar exactamente lo que busco sin revisar todos los productos.

**Criterios de aceptación:**
- **Dado** que el usuario aplica un filtro de talla,  
  **cuando** la grilla actualiza,  
  **entonces** solo se muestran productos con stock en esa talla.
- **Dado** que el usuario selecciona "precio más bajo",  
  **cuando** la grilla reordena,  
  **entonces** los productos aparecen de menor a mayor precio base/oferta.
- Los filtros activos persisten en la URL (search params).

#### US-1.3 — Ficha de producto
**Como** comprador,  
**quiero** ver una página de detalle con galería de imágenes, video, descripción y variantes disponibles,  
**para** tomar una decisión de compra informada.

**Criterios de aceptación:**
- **Dado** que el producto tiene imágenes,  
  **cuando** el usuario abre la ficha,  
  **entonces** se muestran mínimo 5 fotos en galería horizontal deslizable.
- **Dado** que el producto tiene video,  
  **cuando** la ficha carga,  
  **entonces** el video se reproduce en loop sin sonido (MP4 nativo).
- **Dado** que el usuario selecciona talla y color,  
  **cuando** el stock de esa variante es 0,  
  **entonces** el botón "Agregar al carrito" se deshabilita con texto "Agotado".
- La ficha incluye el módulo "Completa tu look" con sugerencias de cross-sell.
- La URL usa el slug del producto y es indexable por buscadores.

#### US-1.4 — Guía de tallas
**Como** comprador,  
**quiero** consultar una guía de equivalencias US/CM/EUR sin salir de la ficha,  
**para** elegir la talla correcta y reducir la posibilidad de devoluciones.

**Criterios de aceptación:**
- **Dado** que el usuario toca "Guía de tallas",  
  **cuando** el pop-up abre,  
  **entonces** muestra tabla de equivalencias US, CM y EUR para el tipo de producto.

#### US-1.5 — SEO y datos estructurados
**Como** equipo de marketing,  
**quiero** que cada ficha de producto tenga Schema.org `Product`,  
**para** que Google muestre precio y calificación directamente en resultados.

**Criterios de aceptación:**
- Cada página `/productos/[slug]` incluye JSON-LD con `@type: Product`, `name`, `description`, `image`, `offers` (precio, moneda, disponibilidad).
- `metaTitle` y `metaDescription` se usan en los tags `<title>` y `<meta name="description">`.

---

## Epic 2 — Autenticación y Cuenta

### Descripción
Permite a los compradores registrarse, iniciar sesión y gestionar su cuenta y pedidos.

### User Stories

#### US-2.1 — Registro de cliente
**Como** nuevo comprador,  
**quiero** crear una cuenta con mis datos personales,  
**para** tener un historial de pedidos y acceder a beneficios futuros.

**Criterios de aceptación:**
- **Dado** que el formulario está completo y válido,  
  **cuando** el usuario envía el registro,  
  **entonces** se crea la cuenta y se redirige al usuario a la tienda o al checkout pendiente.
- El formulario solicita: Nombre, Cédula, Teléfono, Fecha de nacimiento, Email, Marca de preferencia, Género (Hombre/Mujer).
- **Dado** que el email ya existe,  
  **cuando** el usuario intenta registrarse,  
  **entonces** ve el mensaje "Este correo ya tiene una cuenta. ¿Quieres iniciar sesión?"

#### US-2.2 — Login con email/password y social
**Como** cliente registrado,  
**quiero** iniciar sesión con mi email o con una cuenta de red social,  
**para** acceder a mi cuenta sin recordar contraseñas.

**Criterios de aceptación:**
- Login con email y contraseña funciona vía better-auth.
- Login social (Google/mínimo un proveedor) redirige correctamente.
- Sesión persiste hasta logout explícito o expiración.

#### US-2.3 — Panel de cuenta
**Como** cliente autenticado,  
**quiero** ver mi historial de pedidos y actualizar mis datos,  
**para** hacer seguimiento a mis compras y mantener mi perfil al día.

**Criterios de aceptación:**
- El usuario ve lista de pedidos con estado, fecha y total.
- Puede actualizar nombre, teléfono y marca de preferencia.

---

## Epic 3 — Carrito y Checkout

### Descripción
Flujo de compra desde agregar al carrito hasta confirmación del pedido.

### User Stories

#### US-3.1 — Carrito persistente
**Como** comprador,  
**quiero** que mi carrito se conserve entre sesiones,  
**para** no perder lo que seleccioné.

**Criterios de aceptación:**
- El carrito de usuario autenticado persiste en BD.
- El carrito de invitado persiste en localStorage.
- Al autenticarse, el carrito local se fusiona con el de la cuenta.

#### US-3.2 — Checkout como invitado
**Como** comprador sin cuenta,  
**quiero** completar una compra sin registrarme,  
**para** reducir la fricción y comprar más rápido.

**Criterios de aceptación:**
- El checkout solicita solo: email, nombre, dirección de envío, teléfono.
- **Dado** que el pedido se procesa,  
  **cuando** se confirma el pago,  
  **entonces** el comprador recibe email de confirmación aunque no tenga cuenta.

#### US-3.3 — Pago con ePayco / MercadoPago
**Como** comprador,  
**quiero** pagar con tarjeta de crédito/débito o PSE vía pasarela colombiana,  
**para** completar mi compra de forma segura.

**Criterios de aceptación:**
- **Dado** que el usuario llega al paso de pago,  
  **cuando** selecciona la pasarela,  
  **entonces** se redirige o se abre el widget de pago (ePayco o MercadoPago).
- **Dado** que el pago es exitoso (webhook),  
  **cuando** llega la notificación,  
  **entonces** el pedido cambia a `CONFIRMED` y se envía el email de confirmación.
- **Dado** que el pago falla,  
  **cuando** llega la notificación de fallo,  
  **entonces** el pedido queda en `PAYMENT_FAILED` y el usuario puede reintentar.

#### US-3.4 — Cupones de descuento
**Como** comprador,  
**quiero** ingresar un código de cupón en el checkout,  
**para** obtener el descuento correspondiente.

**Criterios de aceptación:**
- Cupones PERCENTAGE y FIXED_AMOUNT aplican correctamente.
- Se valida monto mínimo de pedido, vigencia y límite de uso.
- El descuento se muestra en el resumen antes de confirmar.

#### US-3.5 — Email de confirmación
**Como** comprador,  
**quiero** recibir un email personalizado con el resumen de mi pedido,  
**para** tener registro de mi compra.

**Criterios de aceptación:**
- El email incluye: logo One Star, número de pedido, productos, tallas, total, dirección de envío.
- Se envía dentro de los 2 minutos posteriores a la confirmación del pago.

---

## Epic 4 — Panel de Administración

### Descripción
Herramientas para que el equipo One Star opere el negocio sin soporte técnico externo.

### User Stories

#### US-4.1 — CRUD de productos
**Como** operador,  
**quiero** crear, editar y eliminar productos con sus variantes e imágenes,  
**para** mantener el catálogo actualizado.

**Criterios de aceptación:**
- Formulario soporta: nombre, categoría, marca, precio, oferta, género, descripción, imágenes (múltiples), video URL, meta SEO.
- Las variantes (talla × color × SKU × stock) se gestionan en el mismo formulario.
- **Dado** que se guarda un producto,  
  **cuando** se accede a la URL pública,  
  **entonces** el producto aparece disponible en el catálogo.

#### US-4.2 — Gestión de pedidos
**Como** operador,  
**quiero** ver todos los pedidos con su estado y actualizar el tracking,  
**para** gestionar el despacho y comunicar el estado al cliente.

**Criterios de aceptación:**
- Lista paginada con filtros por estado y fecha.
- Detalle de pedido muestra cliente, productos, dirección, total, historial de estados.
- Operador puede cambiar estado (CONFIRMED → SHIPPED → DELIVERED).

#### US-4.3 — Gestión de banners
**Como** operador,  
**quiero** cambiar los banners del home sin código,  
**para** actualizar promociones de forma autónoma.

**Criterios de aceptación:**
- Interfaz de drag-and-drop para reordenar banners.
- Cada banner tiene URL destino, imagen, fecha de inicio/fin y toggle de activo.

#### US-4.4 — Gestión de cupones
**Como** administrador,  
**quiero** crear y desactivar cupones de descuento,  
**para** gestionar campañas promocionales.

**Criterios de aceptación:**
- Se puede definir: código, tipo (%), monto, min. de pedido, vigencia y límite de usos.
- Cupón vencido o agotado no aplica y muestra mensaje claro al comprador.

#### US-4.5 — Dashboard de métricas
**Como** administrador,  
**quiero** ver métricas básicas (ventas del día, pedidos pendientes, productos agotados),  
**para** tener visibilidad del negocio en tiempo real.

**Criterios de aceptación:**
- El dashboard muestra: total de ventas (hoy, semana, mes), pedidos por estado, top 5 productos.
- Los gráficos usan Chart.js vía react-chartjs-2.

---

## Epic 5 — Integraciones

### Descripción
Conexiones con servicios externos para pagos, operaciones y comunicación con clientes.

### User Stories

#### US-5.1 — Pasarela de pago (ePayco o MercadoPago)
Ver US-3.3.

#### US-5.2 — WhatsApp Business
**Como** comprador,  
**quiero** poder contactar a One Star por WhatsApp directamente desde la tienda,  
**para** resolver dudas antes o después de comprar.

**Criterios de aceptación:**
- Botón flotante de WhatsApp visible en la tienda.
- **Dado** que un pedido se confirma,  
  **cuando** se activa la integración,  
  **entonces** el cliente recibe un mensaje de WhatsApp con el número de pedido (Cloud API Meta o Twilio).

#### US-5.3 — Integración Alegra POS
**Como** administrador,  
**quiero** que los pedidos confirmados se registren automáticamente en Alegra,  
**para** mantener la contabilidad y el inventario sincronizados.

**Criterios de aceptación:**
- Cada pedido `CONFIRMED` dispara una llamada a la API de Alegra para crear la factura.
- Los errores de sincronización se registran y son visibles en el admin.

#### US-5.4 — Meta Pixel y GA4
**Como** equipo de marketing,  
**quiero** que los eventos de conversión se envíen a Meta y GA4,  
**para** medir el ROAS de las campañas publicitarias.

**Criterios de aceptación:**
- Eventos `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase` se disparan correctamente.
- La API de Conversiones de Meta (server-side) envía eventos desde webhook de pago.

---

## Epic 6 — Performance y SEO

### Descripción
Garantías técnicas de velocidad, indexabilidad y accesibilidad.

### User Stories

#### US-6.1 — Core Web Vitals
**Como** comprador móvil,  
**quiero** que la tienda cargue rápido,  
**para** no abandonar por tiempos de espera.

**Criterios de aceptación:**
- LCP < 2.5 s en dispositivos móviles (contractual).
- INP < 200 ms en interacciones del catálogo.
- CLS < 0.1 en todas las páginas principales.
- Imágenes en formato WebP con `loading="lazy"` salvo hero (eager + fetchpriority="high").

#### US-6.2 — Mobile-First
**Como** comprador en celular,  
**quiero** una navegación diseñada para pulgares,  
**para** navegar sin dificultad con una sola mano.

**Criterios de aceptación:**
- Header fijo en mobile con logo, menú y carrito.
- Targets táctiles ≥ 44 × 44 px.
- Diseño probado en viewports 320, 375, 768, 1024, 1440.

#### US-6.3 — SEO técnico
**Como** equipo de marketing,  
**quiero** URLs limpias, sitemap y robots.txt correctos,  
**para** maximizar el tráfico orgánico.

**Criterios de aceptación:**
- `sitemap.xml` generado automáticamente con todas las fichas de producto y páginas de categoría.
- `robots.txt` bloquea `/admin/` y permite el resto.
- Canonical tags en páginas con parámetros de filtro.

---

## No Goals (Fuera del alcance MVP)

- Blog/contenido editorial (preparar estructura pero no implementar).
- Programa de fidelización con puntos.
- Plugin Addi para créditos en línea.
- Integración con Clientify u otro CRM.
- Agentes de IA de atención al cliente.
- Multi-tienda / multi-moneda.
