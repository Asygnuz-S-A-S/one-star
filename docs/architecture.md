# Arquitectura — One Star E-Commerce

> **Regla para agentes:** Leer este documento ANTES de tocar cualquier archivo de código.
> Refleja decisiones ya tomadas. No proponer cambios de stack sin actualizar este doc.

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework web | Next.js | 16.2.6 |
| UI Runtime | React | 19.2.4 |
| Lenguaje | TypeScript | 5.x |
| ORM | Prisma | 6.x |
| Base de datos | PostgreSQL | 15+ |
| Autenticación | better-auth | 1.x |
| Estilos | Tailwind CSS | v4 |
| Estado cliente | Zustand | 5.x |
| Validación | Zod | 4.x |
| Tablas admin | TanStack Table | 8.x |
| Animaciones | Motion (framer-motion) | 12.x |
| Gráficas admin | Chart.js + react-chartjs-2 | 4.x |
| Fechas | date-fns | 4.x |
| DnD banners | @atlaskit/pragmatic-drag-and-drop | 1.x |
| Hotkeys admin | hotkeys-js | 4.x |
| Tipografía | Barlow + Montserrat (fontsource) | 5.x |
| Package manager | pnpm | 10.34.5 |
| Containerización | Docker + docker-compose | — |

## Estructura de Carpetas

```
src/
├── app/                          # Next.js App Router
│   ├── (shop)/                   # Grupo de rutas de la tienda pública
│   │   └── layout.tsx            # Layout con Header fijo
│   ├── admin/                    # Panel de administración
│   │   ├── banners/
│   │   ├── clientes/
│   │   │   └── abandonados/
│   │   ├── configuracion/
│   │   ├── cupones/
│   │   ├── pedidos/
│   │   │   └── [id]/
│   │   └── productos/
│   │       ├── [id]/
│   │       └── nuevo/
│   ├── api/                      # Route Handlers
│   │   ├── auth/[...all]/        # better-auth catch-all
│   │   ├── products/
│   │   └── cuenta/pedidos/
│   ├── checkout/
│   │   └── success/
│   ├── cuenta/                   # Perfil del cliente
│   ├── login/
│   ├── registro/
│   ├── productos/[slug]/         # Ficha de producto
│   ├── hombre/ mujer/ ninos/ accesorios/ sale/ lanzamientos/
│   └── carrito/
├── components/
│   ├── cart/                     # CartDrawer
│   ├── checkout/                 # CheckoutStepper, OrderSummary
│   ├── home/                     # HeroBanner, CategoryGrid, FeaturedProducts, …
│   ├── shop/                     # FilterSidebar, ProductGrid, SortBar, …
│   └── ui/                       # ToastContainer y componentes base
├── context/                      # CartContext (React context)
├── hooks/                        # useToast, useAdminHotkeys
├── lib/                          # auth.ts, auth-client.ts, auth-actions.ts, utils.ts, …
├── server/
│   ├── db/prisma.ts              # Singleton de Prisma Client
│   ├── erp/                      # Capa de integración ERP (agnóstica)
│   │   ├── ports/
│   │   │   └── erp.port.ts       # Interfaz IERPAdapter — el único contrato
│   │   ├── adapters/
│   │   │   ├── null.adapter.ts   # Adaptador nulo (dev/test/modo degradado)
│   │   │   ├── alegra.client.ts  # Cliente HTTP de la API de Alegra
│   │   │   └── alegra.adapter.ts # Implementación para Alegra
│   │   ├── erp.container.ts      # Selecciona el adaptador según ERP_PROVIDER
│   │   ├── erp.types.ts          # Tipos compartidos (ERPInvoice, ERPCustomer, …)
│   │   └── index.ts              # Barrel export — punto de entrada único
│   ├── repositories/             # Capa de acceso a datos (patrón Repository)
│   │   ├── admin.repository.ts
│   │   ├── banner.repository.ts
│   │   ├── cart.repository.ts
│   │   ├── category.repository.ts
│   │   ├── coupon.repository.ts
│   │   ├── dashboard.repository.ts
│   │   ├── order.repository.ts
│   │   ├── product.repository.ts
│   │   ├── user.repository.ts
│   │   └── variant.repository.ts
│   ├── services/                 # Lógica de negocio
│   │   ├── admin.service.ts
│   │   ├── banner.service.ts
│   │   ├── cart.service.ts
│   │   ├── category.service.ts
│   │   ├── coupon.service.ts
│   │   ├── dashboard.service.ts
│   │   ├── order.service.ts
│   │   ├── product.service.ts
│   │   ├── user.service.ts
│   │   └── variant.service.ts
│   └── validators/               # Esquemas Zod
│       ├── product.validator.ts
│       └── user.validator.ts
├── store/
│   ├── index.ts                  # Barrel de stores Zustand
│   └── cart.store.ts             # Estado global del carrito
└── types/
    ├── shop.ts
    ├── admin.ts
    └── auth.d.ts
```

## Modelo de Datos (Prisma / PostgreSQL)

### Catálogo
- **Category** → slug único, relación 1:N con Product
- **Product** → precio base, precio de oferta, género (enum), marca, slug, SEO meta, descripción extendida, videoUrl, photosFolderUrl, publicación y disponibilidad por canal; relaciones con ProductImage, Variant, CartItem, OrderItem y cross-sells (M:M auto-relación)
- **ProductImage** → url, alt, position, `color` (nullable), cascade delete
- **Variant** → SKU único, talla (US/CM/EUR), color, stock
- **ProductColorFamily** → agrupación local opcional de varios `Product` que son el mismo modelo en colores distintos

#### Importación de catálogo desde Excel (`/admin/productos/importar`)
- **Estructura y lectura**:
  - Detección automática de la fila de encabezados por nombre (columna "SKU"), tolerando mayúsculas, minúsculas, tildes y alias en español (ej. `NOMBRE DEL PRODUCTO` → `name`, `DESCRIPCIÓN LARGA` / `DESCRIPCIÓN LARGAL` → `extendedDescription`, `EN OFERTA?` → `isOnSale`, `URL FOTOS` → `photosFolderUrl`, `PRODUCTO LISTO` → `readyFlag`).
  - No asume fila fija de notas: los datos arrancan en la fila inmediatamente siguiente a los encabezados, omitiendo solo filas vacías o notas explícitas sin SKU.
- **Formato fila por talla**:
  - Un mismo SKU repetido en varias filas con tallas distintas se interpreta como SKU base y genera variantes `${sku}_${talla}` (ej. `VN0009QC6BT` con tallas 4.5, 5 genera `VN0009QC6BT_4.5`, `VN0009QC6BT_5`). Si el SKU ya contiene guion bajo (`_`), se respeta sin modificar.
  - Normalización de tallas: "7.0" y "7" normalizan a la misma talla "7". Acepta números con medias tallas (.5), sufijos infantiles/juveniles (7I, 12J, 5B), "U" y "Única".
  - Detección de tallas convertidas en fecha por Excel: si la celda tiene formato `d.m` o es fecha de mes 5 con día entre 1 y 13, se recupera como `${día}.${mes}` (ej. 8 de mayo → "8.5") con advertencia en la vista previa. Cualquier otra fecha se rechaza con error claro.
  - Duplicados reales: mismo SKU y misma talla en dos filas genera error detallando ambas filas (`filas X e Y`).
- **Alias y filtros de negocio**:
  - Alias de marca: tabla configurable en código (`BRAND_ALIASES`) que mapea equivalencias comunes (ej. `ONCLOUD` → `On`, `ACESSORIOS VANS` → `Accesorios Vans`).
  - Marcas omitidas: filas con marcas no catalogables (`BOLSAS DE VENTA`, `BONO`, `FALTA ORGANIZAR ESTA REFERENCIA`) se ignoran sin error y se reportan como omitidas.
  - Alias de género: `NIÑOS`/`NIÑO` → `NINO`, `NIÑA`/`NIÑAS` → `NINA`, `BEBÉ` → `BEBE`.
  - Filtro "PRODUCTO LISTO": opción para importar únicamente filas marcadas como `OK` / `SI` / `LISTO`; las demás se reportan como omitidas (no listas).
- **Imágenes y Drive**:
  - Soporte de hasta 8 imágenes por producto (`image1` a `image8`).
  - La columna `URL FOTOS` enlaza a una carpeta de Drive: se guarda en el campo de referencia `Product.photosFolderUrl` y no se trata como archivo de imagen individual.
  - Si un producto nuevo no tiene fotos individuales cargadas, se crea como no publicado (`isPublished = false`) con advertencia "sin fotos".
- **Seguridad ERP**:
  - Los productos y variantes gestionados por ERP (`erpId != null`) están protegidos: si un SKU del Excel coincide con uno del ERP, la fila se rechaza como error y nunca se sobreescribe.

#### Familias de productos por color

Loggro conserva cada color como un producto independiente. `Product.colorFamilyId` permite
relacionar esos registros solo dentro de One Star mediante `ProductColorFamily`, sin mover
variantes ni mezclar SKU, precios, inventario o imágenes. `Product.erpColorFamilyKey` guarda una
clave opaca y namespaced que entrega `IERPAdapter`; el core nunca interpreta códigos Loggro.
`ProductColorFamily.erpColorFamilyKey` solo se completa en familias automáticas, mientras que
`null` identifica familias manuales y les da precedencia.

La sincronización reconcilia una familia únicamente cuando el producto es nuevo o cambia su
clave ERP. Por eso retirar manualmente un producto no se revierte en ejecuciones posteriores con
la misma clave. Cualquier edición explícita convierte la familia en manual; el reconciliador no
la fusiona, completa ni elimina. La operación usa transacción y advisory lock, exige al menos dos
productos con colores reales distintos y nunca modifica variantes, stock, precios, SKU o fotos.

El backfill histórico es independiente de `ERP_CATALOG_WRITES_ENABLED`: primero se ejecuta
`previewErpColorFamilyBackfill()`, se revisan conteos/omisiones y luego se pasa exactamente su
`fingerprint` a `applyErpColorFamilyBackfill(fingerprint)`. Si el catálogo cambió entre ambas
fases, el apply falla sin escribir y obliga a generar otro preview.

El catálogo colapsa los miembros encontrados de una familia en una sola tarjeta después de
aplicar filtros y antes de paginar. Sus miniaturas llevan al `slug` del producto/color real.
La ficha usa la misma relación para navegar entre colores, de modo que tallas, stock y carrito
siempre corresponden únicamente al producto seleccionado.

#### Imágenes por color de variante

`ProductImage.color` vincula cada foto con un color de `Variant.color` (string libre, el mismo
que sincroniza el ERP). `null` significa "imagen general del producto".

En la ficha (`ProductDetail`), al seleccionar un color la galería muestra **las fotos de ese
color más las generales**. Si el color no tiene fotos propias, se muestra la galería completa
en lugar de dejarla vacía. La lógica vive en `src/lib/product-image.ts` (`filterImagesByColor`),
que compara colores ignorando mayúsculas y acentos.

`ProductDetail` es el componente cliente que une `ProductGallery` y `ProductInfo` porque ambos
comparten el color seleccionado; la página `productos/[slug]` sigue siendo Server Component.

#### Imagen predeterminada

`public/placeholder-product.svg` se usa cuando un producto no tiene fotos cargadas.
Se referencia siempre por la constante `PLACEHOLDER_IMAGE_URL` de `src/lib/product-image.ts`
(nunca hardcodear la ruta). Aplica en ficha, galería, tarjetas, carrito, checkout, historial de
pedidos y panel admin.

#### Publicación y disponibilidad por canal

`Product.isPublished` controla si el producto pertenece al catálogo público. Un producto no
publicado no aparece en grids, filtros, búsqueda pública, carruseles, relacionados, API ni ficha
directa, y tampoco puede agregarse a un pedido. El administrador conserva acceso completo y puede
volver a publicarlo.

`availableOnline` y `availableInStores` tienen una semántica distinta: describen en qué canal se
puede comprar un producto publicado. Por ejemplo, `isPublished=true` con `availableOnline=false`
y `availableInStores=true` sigue mostrando la ficha como “solo disponible en tiendas físicas”.
El checkout exige simultáneamente `isPublished=true` y `availableOnline=true`.

El adaptador ERP puede sugerir que un artículo nuevo nazca no publicado. La sincronización
recurrente nunca cambia `isPublished` en productos existentes. Los históricos se corrigen con un
backfill explícito cuya huella incluye `erpId`, nombre, razón y `updatedAt`; la escritura repite
esas condiciones para no sobrescribir una edición administrativa concurrente.

### Usuarios (dual-model)
- **User** (negocio): email, passwordHash, role, datos de perfil completos (cédula, teléfono, fecha nacimiento, marca preferida, género)
- **AuthUser / AuthSession / AuthAccount / AuthVerification** (better-auth): prefijo `Auth*`, mapeados a tablas `ba_*`. Se usa `prismaAdapter` apuntando a estos modelos.
- **AdminUser**: email, passwordHash, AdminRole (SUPER_ADMIN | INVENTORY_OPERATOR)

### Carrito y Pedidos
- **Cart** → 1:1 con User, items con Variant y Product
- **CartItem** → quantity, variant, product
- **Order** → estado logístico (enum `OrderStatus`: PENDING → PAID → SHIPPED → DELIVERED / CANCELLED), estado del pago (enum `PaymentStatus`: PENDING, APPROVED, REJECTED, FAILED, EXPIRED), `paidAt`, `paymentReference` (ref_payco), total, shipping (Json con dirección, método, costo y cupón), items. **Solo cuenta como venta cuando `paymentStatus = APPROVED`**: el pedido se crea PENDING al entrar al checkout de ePayco y pasa a PAID únicamente cuando la pasarela confirma (webhook `x_id_invoice` o consulta por `ref_payco` desde la página de respuesta). Los que nunca reciben notificación vencen pasadas 24 h vía `/api/cron/expire-orders` (`EXPIRED`; el cron es diario, así que en la práctica cierran entre 24 y 48 h); el correo de confirmación y el `Purchase` de Meta se disparan solo al aprobar el pago.
- **OrderItem** → snapshot de precio, quantity, variante
- **AbandonedCart** → email, cartData (Json), userId opcional, recoveredAt
- **Lead / LeadEvent** → leads captados desde el asistente de WhatsApp (`waPhone` normalizado a dígitos, `name`, `ctwaClid`, `consentAt`, `optedOut`/`optedOutAt`, `shortCode`, `productSlug`, `utmSource`/`utmMedium`/`utmCampaign`/`utmContent`, `stage` con enum `LeadStage`: `NUEVO` → `INTERESADO` → `CARRITO` → `CHECKOUT` → `ABANDONO` → `COMPRO`) y su historial en `LeadEvent`. `Order.leadId` vincula la compra con el lead mediante la cookie firmada `os_lead` (30 días, `httpOnly`, `SameSite=Lax`) o el teléfono del pedido.

### Banners y Cupones
- **Banner** → url, imageUrl, position, isActive, fechas
- **Coupon** → code único, PERCENTAGE | FIXED_AMOUNT, validaciones de fecha y uso

### Programación ERP
- **ErpSyncConfig** → singleton persistente (`id=default`) con activación, intervalo permitido y próximo vencimiento.
- El repositorio reclama un vencimiento con un `UPDATE ... WHERE nextRunAt <= now RETURNING` y adelanta `nextRunAt` antes de consultar el ERP. Así dos procesos no ejecutan el mismo vencimiento y no se mantiene una transacción durante llamadas HTTP.
- Desactivar el automático pone `nextRunAt=null`; la sincronización manual permanece independiente.
- La programación solo puede activarse cuando el `IERPAdapter` efectivo implementa `fetchCatalog`. Si una configuración heredada permanece activa con un adaptador incompatible —incluido el fallback nulo por credenciales ausentes— el scheduler la reconcilia a `enabled=false` y `nextRunAt=null` antes de reclamar el vencimiento. La operación compara el `updatedAt` observado y modifica únicamente esos dos campos: preserva el intervalo y no pisa una edición concurrente posterior; también limpia vencimientos residuales de configuraciones ya inactivas. Esos ticks se omiten con `catalog_sync_unavailable`, sin consultar el ERP ni generar fallos repetitivos.

### Configuración global
- **StoreSettings** → registro único (`id = "default"`): nombre, email y WhatsApp de contacto (Configuración); `metaPixelId`, `metaPixelEnabled`, `metaTestEventCode` y `metaAccessToken` (solo servidor) para Meta Pixel + API de Conversiones (Integraciones → Marketing)
- **SiteContent** → registro único (`id = "default"`): beneficios generales (`highlights`), preguntas frecuentes globales (`faqs`), promesas de tienda editables (`promises`) y plazo legal de devoluciones (`returnWindowDays`, por defecto 30).

### Ficha de producto y Marcas: conversión y SEO en 3 niveles

- **Resolución jerárquica de contenido (`resolveProductContent`)**:
  - Regla de prioridad: `producto > marca > global > predeterminado`.
  - Beneficios (`highlights`): si el producto tiene lista, se usa esa; si no, la de la marca; si no, la global.
  - Preguntas frecuentes (`faqs`): si el producto tiene lista, se usa esa; si no, la de la marca; si no, la global.
  - Promesas y plazos (`promises` y `returnWindowDays`): definidas a nivel global. Las promesas de envío y plazo de entrega provienen estrictamente de las constantes del sistema (`STANDARD_SHIPPING_THRESHOLD` y `DELIVERY_BUSINESS_DAYS`) para garantizar consistencia con el checkout. Devoluciones, pago seguro y soporte son editables desde `/admin/contenido`.
- **Páginas de marca (`/marcas/[slug]`)**:
  - Hero con logo, banner optimizado, descripción e historia/filosofía (texto plano seguro).
  - Beneficios de marca y catálogo completo con filtros (`ProductGrid` y `FilterSidebar`).
  - Reseñas destacadas de productos de esa marca (`isApproved: true` y `isFeatured: true`).
  - Preguntas frecuentes propias de la marca.
  - SEO propio en `src/lib/seo/brand-seo.ts`: `CollectionPage` con `ItemList`, `Brand`, `BreadcrumbList` y `FAQPage` (sin `aggregateRating` en marca para cumplir directrices de Google y evitar penalizaciones por self-serving reviews).
- **Guía de tallas por marca (`SizeGuideModal`)**:
  - `sizeGuideImageUrl` y `sizeGuideNote` en el modelo `Brand` (administrables desde `/admin/marcas`).
  - La ficha de producto muestra la guía visual específica de la marca (ej. tabla oficial de Converse o Nike) con nota aclaratoria (ej. "calza medio número más grande").
  - Si la marca no tiene imagen personalizada configurada, el modal recurre a la tabla estándar (CM / EU / US / UK).
  - Accesibilidad completa: rol `dialog`, `aria-modal="true"`, cierre con tecla `Escape` o clic fuera, bloqueo de scroll del `body`, foco retornado al botón disparador y soporte de pinch-zoom móvil (`touch-auto`).
- **Reseñas con moderación y destacadas** (`ProductReview`):
  - `isApproved`: las de clientes entran pendientes; solo las aprobadas se publican y puntúan en el SEO del producto. El admin las aprueba, oculta, edita o elimina en `/admin/resenas`.
  - `isFeatured`: permite marcar testimonios para destacarlos en la página de marca. Al desaprobar u ocultar una reseña, la marca `isFeatured` se apaga automáticamente.
- **SEO de producto** vive en `src/lib/seo/product-seo.ts`: título/descripción, canonical limpio, Open Graph/Twitter y JSON-LD `@graph` con `Product` (oferta, disponibilidad, envío, devoluciones sincronizadas con `returnWindowDays`, `aggregateRating` y `review`), `BreadcrumbList` y `FAQPage` resuelto. El sitemap incluye todas las marcas activas y fotos de productos.
- **Móvil**: `StickyBuyBar` fija precio y botón cuando el botón principal no está a la vista; si falta la talla, la pide en lugar de fallar en silencio.
- **E2E**: `e2e/product-page.spec.ts`, `e2e/admin-resenas.spec.ts`, `e2e/admin-ficha-conversion.spec.ts`, `e2e/admin-contenido.spec.ts` y `e2e/brand-page.spec.ts`.

## Decisiones Arquitectónicas Tomadas

| # | Decisión | Justificación |
|---|---|---|
| 1 | **Patrón Repository + Service** en `src/server/` | Desacopla acceso a datos de la lógica de negocio; facilita tests unitarios mockeando el repositorio |
| 2 | **better-auth con modelos `Auth*` separados** | Evita colisión con el modelo `User` de negocio; permite tener campos de perfil propios sin hackear el esquema de la lib |
| 3 | **Tailwind v4** (PostCSS plugin) | API CSS-first, sin config JS; tokens definidos en CSS custom properties |
| 4 | **App Router de Next.js** con Server Actions | Reduce el boilerplate de API Routes para mutaciones; SSR nativo para catálogo y SEO |
| 5 | **Zustand** para estado del carrito en cliente | Más ligero que Redux; persistencia local con `persist` middleware |
| 6 | **Docker Compose** con servicio Postgres | Entorno local reproducible; mismo Dockerfile para staging/prod |
| 7 | **`server-only`** en módulos de servidor | Previene importar código de servidor en componentes de cliente en build time |
| 8 | **Capa ERP agnóstica (Ports & Adapters)** en `src/server/erp/` | La tienda NO depende de ningún ERP específico. Cambiar de Alegra a otro ERP = solo cambiar `ERP_PROVIDER` en `.env` y crear un adaptador. El core nunca se modifica. Ver `REQUERIMIENTOS.md §D` |
| 9 | **CSP dinámica con nonce por request** | Bloquea scripts no autorizados sin romper Next.js, ePayco, Sentry, mapas ni el preview administrativo |
| 10 | **Control de acceso administrativo fail-closed con resolución de rol en BD y caché de 60s** | Previene que roles inválidos, nulos o no sincronizados otorguen acceso (fail-open); propaga degradaciones y revocaciones de rol en un máximo de 60 segundos tanto en el proxy (Node runtime) como en Server Actions y páginas de servidor (`requireAdmin`, `requireSuperAdmin`). |

### Content Security Policy

`src/proxy.ts` genera un nonce criptográfico distinto para cada request HTML,
lo reenvía como `x-nonce` al render de Next.js y adjunta la misma política a la
respuesta, incluidos los redirects de autenticación. El layout raíz es dinámico
y distribuye el nonce a `next-themes`, al script de checkout de ePayco y al
JSON-LD de producto.

En producción, `script-src` usa nonce y `strict-dynamic`, sin
`'unsafe-inline'` ni `'unsafe-eval'`. Solo desarrollo incorpora
`'unsafe-eval'`, `ws:` y `wss:` para source maps y recarga en caliente.
`style-src 'unsafe-inline'` se conserva porque Motion, Leaflet, `next-themes` y
el constructor visual generan estilos en runtime; esta excepción no habilita
JavaScript inline.

La política permite conexiones únicamente a ePayco, los endpoints de ingestión
de Sentry y Nominatim. Los frames y formularios externos se restringen a
ePayco. Imágenes y medios admiten HTTPS para Cloudinary, los tiles de OpenStreetMap y los recursos
administrables. `object-src 'none'`, `base-uri 'self'` y
`frame-ancestors 'none'` permanecen cerrados; solo `/?preview=true` admite
`frame-ancestors 'self'` para el iframe interno del panel.

Agregar un proveedor de scripts, tracking, conexiones o frames exige actualizar
el inventario en `src/lib/content-security-policy.ts`, sus pruebas y esta
sección. No se deben usar comodines globales ni nonces fijos.

### Control de Acceso Administrativo y Resolución de Rol Fail-Closed

El sistema de roles administrativos (`SUPER_ADMIN` y `INVENTORY_OPERATOR`) sigue un principio estricto de **fail-closed**:

1. **Normalización estricta**: `normalizeAdminRole` en `src/lib/admin-access.ts` devuelve `AdminRole` si coincide exactamente con un rol conocido; ante cualquier otro valor (nulo, indefinido, vacío, errores de tipografía o mayúsculas, o roles nuevos no incorporados), devuelve `null`.
2. **Proxy en Node runtime**: `src/proxy.ts` se ejecuta en el runtime Node.js de Next.js, lo que permite consultar el rol activo del administrador directamente contra `AdminUser.role` a través de `resolveActiveAdminRole`. Para evitar latencia excesiva en cada solicitud, el rol se mantiene en una caché en memoria de proceso por un máximo de 60 segundos (`ADMIN_ROLE_CACHE_TTL_MS = 60000`).
3. **Efecto inmediato de degradaciones/revocaciones**: Al degradar o eliminar a un administrador en la base de datos, el cambio surte efecto en el proxy y en el panel en a lo sumo 60 segundos (o de inmediato si se invalida la caché), sin requerir que el usuario cierre sesión o espere la expiración de su cookie de autenticación.
4. **Respuesta ante rol inválido**: Si un usuario con sesión no tiene un rol válido en la base de datos, `proxy.ts` deniega el acceso redirigiendo a `/admin/login`, borra las cookies de sesión en la respuesta (`better-auth.session_token` y `__Secure-better-auth.session_token`) y revoca el token en base de datos.
5. **Defensa en profundidad en el servidor**: `requireAdmin()` y `requireSuperAdmin()` en `src/server/auth/require-admin.ts` y las páginas dinámicas del panel admin resuelven igualmente el rol activo desde la base de datos mediante `resolveActiveAdminRole`. Si el rol no es válido, lanzan `UnauthorizedError`.
6. **Aprovisionamiento explícito**: `scripts/create-admin.ts` exige la variable `ADMIN_ROLE` de forma obligatoria y sin valor por defecto, validando exhaustivamente que sea un rol conocido.

## Decisiones Arquitectónicas Pendientes

| # | Área | Opciones |
|---|---|---|
| P1 | **Pasarela de pago** | ePayco vs MercadoPago — ambas mencionadas; definir SDK y webhook |
| P2 | **Carga de imágenes** | ✅ Cloudinary — `POST /api/upload` acepta multipart y retorna `secure_url` |
| P3 | **Email transaccional** | Resend vs SendGrid vs SMTP propio para confirmaciones de pedido |
| P4 | **ERP concreto a conectar** | Arquitectura agnóstica ya construida. Definir qué ERP usar y activar su adaptador |
| P5 | **WhatsApp Business** | Cloud API Meta vs Twilio; trigger en nuevo pedido |
| P6 | **Schema.org / SEO estructurado** | Implementar `Product` schema en ficha; `BreadcrumbList` en categorías |
| P7 | **Tracking** | Meta Conversions API + GA4; configurar eventos de conversión post-checkout |

## Patrones de Datos

### Server Actions (Next.js)
Las mutaciones se implementan como Server Actions en archivos `actions.ts` dentro de cada ruta de la app. El flujo es:
```
Client Component → Server Action → Service → Repository → Prisma → PostgreSQL
```

### API Routes
Se usan para endpoints que necesitan acceso desde el cliente sin full-page navigation (e.g., `/api/products`, `/api/cuenta/pedidos`).

### Validación
Zod valida en la capa de `validators/` antes de llamar servicios. Los errores se devuelven tipados.

## Stock por sede (informativo)

El ERP entrega las existencias por establecimiento y la web las publica en dos niveles:

| Dato | Dónde vive | Quién lo escribe | Para qué sirve |
|---|---|---|---|
| Total vendible por variante | `Variant.stock` | Sincronización ERP; se descuenta al pagar | Catálogo, filtros, selector de tallas, validación del checkout |
| Desglose por sede | `InventoryLevel` (`variantId` × `storeLocationId`) | Sincronización ERP para sedes con `StoreLocation.erpId`; el admin para sedes sin vínculo | Ficha de producto ("Fundadores: 2 · Centro: 1") y formulario administrativo |

Reglas:

- `StoreLocation.erpId` (único) vincula una tienda física con el establecimiento del ERP. La
  sincronización garantiza una sede por establecimiento: reutiliza la vinculada, enlaza por nombre
  una sede sin vínculo (`normalizeStoreName`) o la crea **oculta** con dirección/ciudad `Por definir`
  para que el administrador la complete en `/admin/tiendas` antes de publicarla.
- El desglose es **solo informativo**: la web no reserva ni aparta unidades de tienda y no ofrece
  recogida en sede. El cliente ve dónde hay existencias para comprarlas presencialmente.
- Al pagar un pedido se descuenta `Variant.stock` y, en la misma transacción, el desglose de las
  sedes con más existencias; la siguiente sincronización vuelve a alinear ambos con el ERP.
- El formulario de producto solo permite editar el stock de sedes sin vínculo ERP y solo reemplaza
  las filas de las sedes que envía, para no borrar el desglose sincronizado.
- La capa ERP expone el desglose de forma agnóstica: `ERPCatalogSnapshot.locations`,
  `ERPCatalogVariant.stockByLocation` y `IERPAdapter.listStockLocations?()`. Un ERP que no
  distinga sedes simplemente no los informa y la tienda sigue funcionando con el total.

## Variables de Entorno Requeridas

> Inventario completo y comentado: **`.env.example`** (versionado).
> Procedimiento de despliegue: **`docs/deploy-docker.md`**.

```bash
# Base de datos
POSTGRES_USER=...                 # Inicializa el contenedor PostgreSQL de producción
POSTGRES_PASSWORD=...             # Solo en el entorno del servidor; nunca versionar
POSTGRES_DB=...                   # Base creada por el contenedor PostgreSQL
DATABASE_URL=postgresql://...     # Conexión de runtime
DIRECT_URL=postgresql://...       # Conexión directa para migraciones de Prisma
DATABASE_STARTUP_MAX_ATTEMPTS=12  # Intentos de conexión del entrypoint Docker antes de abortar
DATABASE_STARTUP_RETRY_SECONDS=5  # Segundos entre sondeos de conexión del entrypoint
DATABASE_STARTUP_PROBE_TIMEOUT_SECONDS=5 # Timeout de cada sondeo; rango permitido 1..60
# En el despliegue Docker ambas apuntan al mismo Postgres. Si algún día se usa un
# pooler externo NO son intercambiables: DATABASE_URL debe ir al pooler (modo
# transaction) con ?pgbouncer=true, y DIRECT_URL a la conexión directa, porque
# `prisma migrate` necesita una sesión persistente para los advisory locks y el
# DDL transaccional.

# Autenticación (better-auth)
AUTH_SECRET=...                   # Secret para firmar sesiones
BETTER_AUTH_SECRET=...            # Alias soportado por auth.ts
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Integración ERP (agnóstica — ver src/server/erp/)
ERP_PROVIDER="null"               # "null" | "alegra" | "siigo" | "loggro" | (futuro)
ALEGRA_EMAIL=""                   # Email de la cuenta Alegra
ALEGRA_API_KEY=""                 # API Key de Alegra
LOGGRO_API_TOKEN=""               # Token Bearer de conexión para Loggro Pymes
LOGGRO_BASE_URL=""                # Base URL para Loggro Pymes (default: https://api.loggro.com)
LOGGRO_ESTABLECIMIENTO_UUID=""    # (opcional) UUID del establecimiento para consultar existencias
LOGGRO_BODEGA_UUID=""             # (opcional) UUID de la bodega; si se omiten, se auto-detectan
LOGGRO_STOCK_SCOPE="all"          # "all" suma el stock de todas las tiendas | "primary" solo la sede principal
LOGGRO_IVA_RATE="0.19"            # Tasa de IVA de RESPALDO: solo aplica a ítems sin `ivaVenta` válido (ver nota abajo)
ERP_CATALOG_WRITES_ENABLED="false" # Fail-closed: habilitar solo tras validar dry-run y reparar duplicados
DISABLE_INTERNAL_CRON=""          # "1" apaga los cron internos; usar solo con disparador externo
CRON_SECRET=""                    # (opcional) Protege /api/cron/sync-erp para disparadores externos

# Correos transaccionales (Resend — ver src/server/email/)
RESEND_API_KEY=""                 # API key de Resend (https://resend.com/api-keys)
EMAIL_FROM="One Star <onboarding@resend.dev>"  # Remitente. En producción usa un dominio verificado en Resend
# Para Siigo u otro ERP, documentar sus variables aquí al agregar el adaptador

# Sentry (observabilidad — opcionales en desarrollo, requeridas en producción)
SENTRY_DSN=https://...@o0.ingest.sentry.io/...   # DSN del proyecto Sentry (server)
NEXT_PUBLIC_SENTRY_DSN=https://...               # DSN público (client bundle)
SENTRY_ORG=one-star                              # Slug de la organización en Sentry
SENTRY_PROJECT=one-star-web                      # Slug del proyecto en Sentry
SENTRY_AUTH_TOKEN=...                            # Token para subir source maps en CI

# ePayco (pasarela de pagos — integrada)
NEXT_PUBLIC_EPAYCO_PUBLIC_KEY=...   # Llave pública del dashboard de ePayco
EPAYCO_PRIVATE_KEY=...              # Llave privada (solo servidor) para firmar webhook
EPAYCO_CUSTOMER_ID=...              # ID del cliente en ePayco (p_cust_id_cliente)
NEXT_PUBLIC_EPAYCO_TEST=true        # "true" en staging, "false" en producción

# Cloudinary (carga de imágenes de productos — ver src/app/api/upload/route.ts)
CLOUDINARY_CLOUD_NAME=...        # Nombre del cloud (Dashboard > Settings)
CLOUDINARY_API_KEY=...           # API Key
CLOUDINARY_API_SECRET=...        # API Secret (solo servidor)

# Chatbot de ventas (ver src/server/services/ai-chat.service.ts)
ANTHROPIC_API_KEY=...            # Sin esto, el chat responde "no disponible" en vez de romper la página
ANTHROPIC_MODEL=claude-sonnet-5  # Opcional; ya es el default

# API del Asistente WhatsApp (n8n — ver /api/assistant/* y src/server/services/assistant-auth.service.ts)
ASSISTANT_API_KEY=...            # Clave requerida en x-assistant-key (sin ella los endpoints responden 503)
ASSISTANT_RATE_LIMIT_PER_MIN=60  # Rate limit general por minuto (default: 60)
ASSISTANT_PHONE_RATE_LIMIT_PER_MIN=30 # Rate limit por waPhone por minuto en rutas POST de leads (default: 30)

# Seguimiento de Envíos (Envía — ver src/server/shipping/tracking/)
ENVIA_API_URL=...                # URL del servicio de tracking de Envía (opcional, sin ella tracking=null)
ENVIA_API_TOKEN=...              # Token Bearer de autenticación para Envía (opcional)
ENVIA_TRACKING_URL_TEMPLATE="https://envia.co/rastreo?guia={guia}" # Plantilla para trackingUrl público
```

**Nota sobre el IVA de Loggro (`LOGGRO_IVA_RATE`).** Loggro entrega el precio
de venta SIN IVA y el contrato del core (`basePrice`) es el precio final que
paga el cliente, así que el adaptador suma el IVA al normalizar el catálogo
(`src/server/erp/adapters/loggro-pricing.ts` y `loggro-catalog.normalizer.ts`).
La tasa se resuelve por ítem, en este orden:

1. `ivaVenta` del ítem vendible (porcentaje, ej. `"19.00"`, `"5.00"`, `"0"`).
2. `ivaVenta` de la definición padre (`definicion: true`) a la que pertenece.
3. `LOGGRO_IVA_RATE` (default `0.19`), solo cuando ninguno de los anteriores
   viene o es válido.

Reglas de validez: se acepta string o número, con punto o coma decimal; los
valores `>= 1` se leen como porcentaje y los menores como fracción; negativos,
no numéricos o `>= 100 %` se descartan y se cae al siguiente nivel. `"0"` es
válido e identifica un ítem exento: se publica a precio neto aunque la tasa
global sea 19 %. En consecuencia, `LOGGRO_IVA_RATE=0` ya NO desactiva el IVA
para ítems que traen `ivaVenta`; solo afecta a los que no lo traen. El precio
siempre se redondea al peso más cercano.

Variables pendientes de definir:
- `MERCADOPAGO_ACCESS_TOKEN`
- `RESEND_API_KEY` (o equivalente de email)
- `GA4_MEASUREMENT_ID`

Meta Pixel y API de Conversiones **no usan variables de entorno**: el ID del
píxel, el token de la API de Conversiones y el código de evento de prueba se
administran desde `/admin/integraciones` (sección Marketing) y viven en la
tabla `StoreSettings`. El token nunca se envía al navegador; solo lo lee
`src/server/services/meta-conversions.service.ts`, que dispara el `Purchase`
server-side desde el webhook de ePayco con `event_id` = id del pedido para que
Meta lo deduplique contra el `Purchase` del píxel. `BETTER_AUTH_URL` se reutiliza
como base de `event_source_url`.

## Despliegue

El despliegue es un contenedor Docker construido con `output: "standalone"`,
junto a un PostgreSQL propio. El proceso Node queda vivo entre peticiones, así
que las tareas programadas viven dentro de la aplicación.

| | Configuración actual |
|---|---|
| Dónde | contenedor Docker (local, VPS, Lightsail) |
| Postgres | contenedor `db` |
| Sync ERP | `node-cron` despierta cada minuto; PostgreSQL decide el vencimiento |
| Vencimiento de pedidos | `node-cron` a las 07:30 |

**Programación del cron.** `node-cron` requiere un proceso vivo entre
ejecuciones, y el contenedor lo tiene. `instrumentation-node.ts` programa las
dos tareas al arrancar.

Los endpoints `GET /api/cron/sync-erp` y `GET /api/cron/expire-orders` siguen
existiendo para un disparador externo (crontab, EventBridge) con
`Authorization: Bearer $CRON_SECRET`. Si se usa uno, hay que apagar el cron
interno con `DISABLE_INTERNAL_CRON=1` para no ejecutar la tarea dos veces; con
un disparador externo, la frecuencia efectiva nunca supera su propia cadencia,
por más que el administrador configure un intervalo menor.

`erp-sync-scheduler.service.ts` usa `ErpSyncConfig` como fuente de verdad.
`instrumentation-node.ts` y `/api/cron/sync-erp` solo despiertan el coordinador;
no contienen una frecuencia de negocio fija.

`CRON_SECRET` es *fail-closed*: en producción, sin ella el endpoint responde
`503` en vez de ejecutar la sincronización sin autenticar.

Procedimiento paso a paso: **`docs/deploy-docker.md`**.

En servidor propio, el entrypoint del `runner` sondea PostgreSQL con reintentos
acotados y ejecuta `prisma migrate deploy` antes de `node server.js`; nunca
ejecuta seed. Por defecto intenta 12 veces, limita cada sondeo a 5 segundos y
pausa 5 segundos entre fallos. Los límites se configuran con las variables
`DATABASE_STARTUP_*` documentadas arriba. Cada ejecución del entrypoint tiene un
límite finito; `restart: unless-stopped` inicia un ciclo nuevo tras una salida
fallida y recupera la tienda cuando Docker o el VPS reinician. Un fallo de
conexión o migración impide iniciar la aplicación en ese ciclo. Los comandos
operativos explícitos omiten esta preparación. El CLI aislado y fijado del
`runner` usa el manifest y lock exclusivos de `docker/prisma-cli/`; para
actualizarlo se cambia la versión exacta y se regenera `package-lock.json` con
npm 10.8.2 dentro de `node:20-alpine`. El runner usa `npm ci`, por lo que
cualquier drift hace fallar el build. El lock fija versiones, tarballs e
integridades npm, pero no vuelve byte-idéntica la imagen completa: la base
Alpine, APK y la arquitectura todavía varían. Ningún servicio publica puertos:
el reverse proxy se conecta a `onestar_frontend` y PostgreSQL queda aislado en
`onestar_backend`. Las variables `NEXT_PUBLIC_*` se entregan como argumentos de
build y requieren reconstruir la imagen cuando cambian.

### Invariante de migraciones: expand/contract

Las migraciones aplicadas son inmutables y *forward-only*. CI compara únicamente
los `prisma/migrations/*/migration.sql` cambiados contra el SHA base real del
evento: una migración histórica modificada, eliminada o renombrada falla; una
migración nueva con DDL destructivo también falla. Las expansiones deben permitir
que la versión anterior y la nueva convivan: las columnas nuevas son nullable o
tienen un valor generado/default compatible. `DEFAULT NULL` no cuenta; una
columna `PRIMARY KEY` también es required, y retirar después el default de una
columna required vuelve insegura la expansión. Esto incluye `PRIMARY KEY` de
tabla sobre una columna recién agregada, `SET DEFAULT NULL`, `DROP DEFAULT` y
`DROP IDENTITY` posteriores. Un `ON DELETE SET DEFAULT` referencial no es un
default propio. `SERIAL` e `IDENTITY` sí cuentan como valores generados mientras
no se retiren.

Los cambios incompatibles se separan en tres despliegues:

1. **Expand:** agregar objetos compatibles y ejecutar `prisma migrate deploy`
   antes de reemplazar la aplicación.
2. **Migrar consumidores:** backfill si aplica, retirar del código el uso del
   objeto antiguo y crear o actualizar en ese mismo commit el manifiesto
   `prisma/migration-contracts/<id>.json`. Luego desplegar y verificar ese commit
   en producción.
3. **Contract:** en una migración posterior, declarar
   `-- onestar:contract-after <sha>` y `-- onestar:contract-id <id>`, y recién
   entonces eliminar o renombrar el objeto. CI exige que `<sha>` exista y sea
   ancestro del SHA base, que ese commit haya creado o actualizado el manifiesto
   válido, que `objects` coincida exactamente con los objetivos canónicos del
   DDL y que su contenido sea byte-a-byte idéntico en preparación, base y
   `HEAD`, sin cambios intermedios aunque se restauren los mismos bytes. Un merge
   que integra el manifiesto puede ser el SHA de preparación si lo cambia contra
   su primer padre; un merge ajeno no sirve. La historia entre base y `HEAD`
   tampoco puede tocar el manifiesto. Cada ID sólo
   autoriza una migración: CI rechaza duplicados nuevos o un marcador ya
   consumido en la base. Antes de correr `migrate deploy`, el operador todavía
   debe confirmar manualmente que el commit de preparación sí llegó a
   producción.

El esquema v1, el formato `table:/column:/type:/constraint:` de los objetivos y
la secuencia operativa están definidos en
`prisma/migration-contracts/README.md`. Para verificar unicidad, CI sólo indexa
marcadores `contract-id` históricos; no reevalúa el DDL aplicado. Si la evidencia
cambia después de la preparación, la contracción falla y requiere un contrato
nuevo.

El gate detecta `DROP TABLE/COLUMN/TYPE/CONSTRAINT`, renombres de tabla o
columna, `TRUNCATE`, cambios de tipo, `SET NOT NULL` y columnas nuevas `NOT NULL`
sin default; ignora menciones dentro de comentarios y literales SQL. No existe
bypass silencioso. `DO` y `CALL` top-level se rechazan porque el SQL procedural
no puede verificarse estáticamente; esto no amplía el catálogo DDL y DML sigue
fuera de alcance. En producción siguen prohibidos `prisma db push` y
`prisma migrate dev`.

El reverse proxy es también la frontera de confianza para el límite de login
administrador: debe eliminar cualquier `X-Real-IP` recibido del cliente y
reescribirlo con la IP remota observada. La aplicación valida exclusivamente
esa cabecera e ignora `X-Forwarded-For`; si `X-Real-IP` falta o no contiene una
IP válida, agrupa el intento bajo `unknown` para fallar de forma cerrada. El
contenedor `app` no debe exponerse directamente a Internet.

El límite admite cinco intentos por correo e IP confiable cada quince minutos.
Cuando la IP no es confiable, el balde compartido `unknown` admite veinte para
reducir el riesgo de que un tercero bloquee al administrador, pero nunca omite
el control: el vigesimoprimero se rechaza antes de consultar credenciales. Una
cabecera ausente, vacía o inválida también genera un evento Sentry `warning`
con fingerprint estable y únicamente tags operativos (`security_event` y
`reason`); no se envían correo, contraseña, IP ni el valor crudo de la cabecera.
Como defensa final, el `beforeSend` del proceso Node reconstruye este evento
desde una allowlist: solo conserva `event_id`, `timestamp`, `platform`, `level`,
`message`, `fingerprint` y los tags exactos `security_event` y `reason`. Request,
cookies, usuario, breadcrumbs, contexts, extra, transacción, excepción y
cualquier otro campo heredado se descartan; los demás tipos de evento Sentry no
se modifican.

El proceso deduplica la alerta durante quince minutos después de que
`captureMessage` retorna correctamente. Si Sentry lanza una excepción, la
autenticación continúa y la siguiente solicitud puede reintentar la alerta sin
esperar el cooldown. Para convertir el evento en una notificación a personas
todavía debe configurarse la regla correspondiente en el proyecto de Sentry;
esa configuración externa no pertenece al código de la aplicación.

## Capa ERP — Referencia Rápida

```
src/server/erp/
├── ports/erp.port.ts        ← IERPAdapter — LEER ANTES de tocar integraciones
├── adapters/
│   ├── null.adapter.ts      ← activo en dev (ERP_PROVIDER=null)
│   ├── alegra.client.ts     ← HTTP client Alegra (no usar directamente)
│   ├── alegra.adapter.ts    ← implementación Alegra
│   ├── loggro.client.ts     ← HTTP client Loggro (no usar directamente)
│   └── loggro.adapter.ts    ← implementación Loggro
├── erp.container.ts         ← getERPAdapter() — punto de entrada
├── erp.types.ts             ← ERPInvoice, ERPCustomer, ERPSyncResult, …
└── index.ts                 ← barrel: import { getERPAdapter } from "@/server/erp"
```

**Documentación Detallada de Integraciones:**
- [Loggro ERP: Arquitectura de Sincronización y Agrupación de Catálogo](docs/integrations/loggro-erp.md)

**Regla:** El código de negocio SOLO importa desde `@/server/erp` (el barrel).
Nunca importar adaptadores o clientes directamente.

---

## Fuente de Verdad del Catálogo (ERP vs ARCHIVO)

### Contexto y Decisión de Negocio
En producción (`new.tiendaonestar.com`), la variable `ERP_PROVIDER` permanece en `null` mientras se completa la transición hacia Mekano. Sin embargo, persisten ~513 productos heredados de Loggro que conservan un identificador `erpId` en base de datos (con stock en 0 y precios desactualizados). Adicionalmente, se cargan y curan manualmente imágenes de Cloudinary, descripciones y categorías.

Por decisión de negocio, mientras no exista un ERP conectado, el **archivo Excel de inventario es la fuente de verdad en tiempo real** para precios, stock y tallas disponibles.

### Regla Canónica: `isErpCatalogOwner()`
La condición de pertenencia o bloqueo por ERP **no debe depender únicamente de `product.erpId` o `variant.erpId`**. En su lugar, todo el sistema utiliza el helper canónico:

```ts
import { isErpCatalogOwner } from "@/server/services/catalog-source.service"
```

El helper devuelve `true` **únicamente** si se cumplen dos condiciones simultáneas:
1. La configuración de la tienda (`StoreSettings.catalogSource`) está fijada en `"ERP"`.
2. Existe un proveedor de ERP válido configurado en el entorno (`ERP_PROVIDER` distinto de vacío/null).

Si cualquiera de las dos condiciones no se cumple (por ejemplo, `catalogSource = "ARCHIVO"` o `ERP_PROVIDER = null`), `isErpCatalogOwner()` devuelve `false`.

### Comportamiento según el Modo

1. **Modo ARCHIVO (`isErpCatalogOwner() === false`):**
   - **Importador Excel:** Actualiza precio base, precio de oferta, stock de variante y el `InventoryLevel` web (`storeLocationId = null`) de productos con `erpId`. Nunca elimina `erpId`, imágenes existentes, familias de color ni productos relacionados.
   - **Prevención de duplicados por SKU base:** El importador analiza el SKU base mediante `parseSku(sku).baseSku` (que coincide con el `slug` del producto). Si el producto ya existe con unas tallas y el archivo trae otras, se agregan como variantes al producto existente sin crear un segundo producto duplicado (ej. caso `132173C`).
   - **Cruce de variantes:** Se cruza por coincidencia exacta de SKU; si no coincide, por `(baseSku + talla normalizada)`.
   - **Protección de curación manual:** El importador soporta `textUpdateMode: "fill_empty"` (por defecto), conservando intactas las descripciones, imágenes y datos manuales, y actualizando siempre precios y stock.
   - **Formulario de producto (`ProductForm`):** Los campos de precio base, precio oferta y stock web son editables en el panel de administración aún si el producto tiene `erpId`.
   - **Plan de variantes (`buildProductVariantUpdatePlan`):** Permite actualizar tallas y stock en variantes con `erpId`, y no arroja `ERP_VARIANT_MISSING` al eliminar variantes.

2. **Modo ERP (`isErpCatalogOwner() === true`):**
   - Se mantiene el comportamiento estricto: Loggro/Mekano gobierna variantes y stock. El importador rechaza con `"Gestionado por ERP"` y el plan de actualización lanza `ERP_VARIANT_MISSING` si se omite una variante sincronizada.

### Interruptor en Panel de Administración
- **Ruta:** `/admin/integraciones` (`CatalogSourceSwitch.tsx`).
- **Seguridad:** Restringido exclusivamente al rol **Super Admin** (`requireSuperAdmin`).
- **Persistencia:** Almacenado en la columna `catalogSource` de la tabla `StoreSettings` (con valor por defecto `'ARCHIVO'`).

---

## Optimización y Entrega de Imágenes con Cloudinary

### Problema Resuelto
Por defecto, `next/image` procesa y redimensiona imágenes remotas en el servidor local Node.js (`/_next/image`). Al cargar catálogos con cientos de fotos de Cloudinary en un VPS con recursos acotados, las solicitudes concurrentes saturaban la CPU y memoria del servidor, provocando imágenes rotas (504/timeout) y degradando severamente el LCP móvil.

### Solución: Custom Loader de Cloudinary
Se implementó un loader desacoplado en `src/lib/cloudinary-loader.ts` configurado globalmente en `next.config.ts`:

```ts
// next.config.ts
images: {
  loader: "custom",
  loaderFile: "./src/lib/cloudinary-loader.ts",
}
```

- **Para URLs de Cloudinary (`res.cloudinary.com`):** Inserta transformaciones de borde automáticas (`f_auto,q_auto,w_{width}`) dentro del segmento `/image/upload/`. La optimización y compresión se delega íntegramente al CDN de Cloudinary.
- **Para cualquier otra URL (locales o externas):** Retorna la URL original sin transformaciones.
- **Protección LCP:** Reduce la carga de CPU del VPS a cero para el pipeline de imágenes y entrega tamaños optimizados según el viewport del dispositivo móvil.


## Sistema visual de la tienda pública

Especificaciones de fotos, videos, 360° y banners para el equipo de contenido: [`docs/guia-fotografia-producto.md`](guia-fotografia-producto.md).

Basado en `MANUAL_MARCA.md` (rojo 10 % solo para acentos y CTA, grises 60 %, negro 30 %; Barlow para títulos, Montserrat para texto). Los tokens viven en `.public-storefront` (`src/app/globals.css`) y solo aplican a la tienda; admin, checkout y auth conservan sus estilos.

- **Utilidades:** `bg-store-canvas`, `bg-store-surface`, `text-store-ink`, `text-store-muted`, `rounded-store-{sm,md,lg,xl}`, `shadow-store-{raised,float}`.
- **Primitivas CSS:** `.store-section` (ritmo vertical), `.store-gutter` (márgenes laterales), `.store-heading` (titular de sección), `.store-eyebrow`. Crecen por breakpoint (móvil → `md` → `xl`), no por componente: toda sección nueva del landing builder debe usarlas.
- **Primitivas React:** `src/components/storefront/public-primitives.tsx` (`PublicButton`, `SectionHeading`, `MediaFrame`, `EditorialSurface`).
- **Tipografía:** usar `font-barlow` / `font-montserrat`. `font-[var(--font-barlow)]` no funciona en Tailwind v4 (lo interpreta como peso) y dejaba los títulos en Montserrat.
- **Breakpoints:** mobile-first. El layout de escritorio (header con menú, sidebar de filtros) empieza en `lg` (1024px); por debajo hay header compacto, filtros flotantes y `MobileBottomNav` (oculto en ficha, carrito y checkout, que tienen barra propia).
- **Movimiento:** el contenido se pinta visible desde el servidor; las animaciones de entrada solo desplazan (`ScrollReveal`/`Reveal`), nunca ocultan con `opacity: 0`, para no generar huecos al hacer scroll ni retrasar el LCP. Siempre respetar `prefers-reduced-motion`.

### Landings y secciones (landing builder)

- `LandingSection.page` agrupa secciones por landing: `home` es `/`; cualquier otro slug (`^[a-z0-9-]+$`) se publica en `/campanas/<slug>` cuando tiene al menos una sección activa. Se crean desde `/admin/landing-builder?page=<slug>` (selector "Landing que editas").
- Guardar una sección escribe `draftConfig`. La vista previa (`?preview=true`, solo con sesión de admin) muestra ese borrador. `publishLandingPage` lo copia a `config` y limpia el borrador. Sin sesión, `?preview=true` sigue mostrando lo publicado.
- `src/components/landing/LandingSections.tsx` es el registro de secciones: agregar un tipo = valor en `LandingSectionType` + entrada en `SECTION_RENDERERS` + campos en el editor.
- **Hero escenario de producto:** un `campaignHero` con `foregroundMedia` (PNG sin fondo) y sin imágenes de fondo se muestra con el producto flotando sobre la primera palabra del titular en gigante, sombra elíptica y flecha de rotación.
- **Intro de marca:** `StoreIntro` cubre la home ~1 s solo en la primera visita de la sesión (`sessionStorage`), sin `?preview` y sin movimiento reducido. La página ya está renderizada debajo; la capa se activa con un script con nonce antes del primer pintado.

## One Star Club (comunidad y fidelización)

- **Membresía gratuita** ligada a la cuenta de cliente: `User.clubMember` y `User.clubJoinedAt`. Se activa al registrarse (opción "Unirme a One Star Club", marcada si se llega desde `/club`) o después desde `/club` o la pestaña "One Star Club" de Mi cuenta. Se puede salir en cualquier momento.
- **Newsletter con consentimiento explícito** (Habeas Data): `User.marketingConsentAt` guarda cuándo se aceptó; `null` = no aceptó o lo retiró. Es una casilla aparte y desmarcada; unirse al club no implica aceptar correos.
- **Promociones exclusivas:** cupones con `Coupon.clubOnly = true` (casilla "Solo para One Star Club" en `/admin/cupones`). `/club` los lista con el código visible solo para miembros, y `validateCouponForOrder(code, items, { isClubMember })` los rechaza para no miembros tanto al aplicarlos (`validateCouponAction`, según la sesión) como al pagar (`placeOrder`).
- **Lógica:** `src/server/services/club.service.ts` (estado, unirse, salir, consentimiento, promociones); acciones en `src/app/club/actions.ts` (solo clientes con sesión, nunca administradores).
- **Bienvenida:** `sendClubWelcomeEmail` (Resend) se envía una sola vez, al unirse por primera vez.
- **Admin:** `/admin/clientes` filtra por "Miembros de One Star Club" y "Suscritos al newsletter", y `/admin/clientes/exportar-newsletter` descarga en CSV solo a quienes dieron consentimiento, para cargarlos en la herramienta de envío de correos.
- La sección "Newsletter" del constructor ahora invita al club (no hay formulario suelto de suscripción sin cuenta).

## Integración con Addi (Widget Oficial)

- **Componente Oficial (`AddiWidget`):** Carga el web component `<addi-widget>` oficial (`https://s3.amazonaws.com/widgets.addi.com/bundle.min.js`) mediante `next/script` con estrategia `afterInteractive` y nonce de la CSP.
- **Configuración Dinámica:** Consulta server-side `https://channels-public-api.addi.com/allies/{ally_slug}/config?requestedamount={monto}` (`src/server/services/addi-config.service.ts`) con caché corto y tolerancia a fallos.
- **Validación de Elegibilidad:**
  - Si el aliado está inactivo (`isActiveAlly = false`) o la política no es visible (`policy.isVisible = false`), el widget se oculta.
  - Si el monto se encuentra fuera del rango crediticio (`[minAmount, maxAmount]`), se despliega un aviso accesible ("Addi aplica para compras entre X y Y") sin inventar cuotas ni ocultar la información.
  - El campo `policy.discount` es meramente visual y nunca altera el precio del producto o carrito.
- **Variables de Entorno:**
  - `ADDI_ALLY_SLUG`: Slug del aliado comercial asignado por Addi (por defecto `onestar-ecommerce`). Solo para el widget.
  - Pago (`src/server/services/addi-payment.service.ts`): `ADDI_API_URL`, `ADDI_AUTH_URL`, `ADDI_AUDIENCE` (solo staging), `ADDI_CLIENT_ID`, `ADDI_CLIENT_SECRET`. Sin ellas el botón "Pagar a cuotas con Addi" responde error y no se llama a Addi.
  - Callback `POST /api/addi/callback`: `ADDI_CALLBACK_USER` y `ADDI_CALLBACK_PASSWORD` (Basic auth). Sin ellas responde 503. Reutiliza `applyPaymentNotification` (idempotente) y devuelve el mismo JSON recibido.
