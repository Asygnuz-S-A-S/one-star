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
| Package manager | pnpm | workspace |
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
- **Product** → precio base, precio de oferta, género (enum), marca, slug, SEO meta, descripción extendida, videoUrl; relaciones con ProductImage, Variant, CartItem, OrderItem y cross-sells (M:M auto-relación)
- **ProductImage** → url, alt, position, `color` (nullable), cascade delete
- **Variant** → SKU único, talla (US/CM/EUR), color, stock

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

### Usuarios (dual-model)
- **User** (negocio): email, passwordHash, role, datos de perfil completos (cédula, teléfono, fecha nacimiento, marca preferida, género)
- **AuthUser / AuthSession / AuthAccount / AuthVerification** (better-auth): prefijo `Auth*`, mapeados a tablas `ba_*`. Se usa `prismaAdapter` apuntando a estos modelos.
- **AdminUser**: email, passwordHash, AdminRole (SUPER_ADMIN | INVENTORY_OPERATOR)

### Carrito y Pedidos
- **Cart** → 1:1 con User, items con Variant y Product
- **CartItem** → quantity, variant, product
- **Order** → estado (enum OrderStatus), total, shipping, items, couponId
- **OrderItem** → snapshot de precio, quantity, variante
- **AbandonedCart** → email, cartData (Json), userId opcional, recoveredAt

### Banners y Cupones
- **Banner** → url, imageUrl, position, isActive, fechas
- **Coupon** → code único, PERCENTAGE | FIXED_AMOUNT, validaciones de fecha y uso

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

## Variables de Entorno Requeridas

> Inventario completo y comentado: **`.env.example`** (versionado).
> Procedimiento de despliegue: **`docs/deploy-vercel.md`**.

```bash
# Base de datos
DATABASE_URL=postgresql://...     # Conexión de runtime
DIRECT_URL=postgresql://...       # Conexión directa para migraciones de Prisma
# En local ambas apuntan al mismo Postgres. En serverless NO son intercambiables:
# DATABASE_URL debe ir al pooler (modo transaction) con ?pgbouncer=true, porque
# cada invocación abre su propia conexión; DIRECT_URL debe ser la conexión
# directa, porque `prisma migrate` necesita una sesión persistente para los
# advisory locks y el DDL transaccional.

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
```

Variables pendientes de definir:
- `MERCADOPAGO_ACCESS_TOKEN`
- `RESEND_API_KEY` (o equivalente de email)
- `META_PIXEL_ID` / `META_ACCESS_TOKEN`
- `GA4_MEASUREMENT_ID`

## Despliegue

El proyecto soporta dos topologías. El código es el mismo; la diferencia se
detecta en tiempo de ejecución con `process.env.VERCEL`.

| | Con proceso persistente | Serverless |
|---|---|---|
| Dónde | local, Docker, VPS, Lightsail | Vercel |
| Postgres | contenedor `db` | Supabase (pooler 6543 en runtime + pooler 5432 para migraciones) |
| Sync ERP | `node-cron` cada 30 min en `src/instrumentation-node.ts` | disparador externo → `GET /api/cron/sync-erp` |

**Programación del cron.** `node-cron` requiere un proceso vivo entre
ejecuciones, algo que no existe en serverless: allí cada request crea y destruye
su propia instancia, así que el `schedule` nunca dispara. Por eso
`instrumentation-node.ts` se salta la inicialización cuando `VERCEL === "1"`, y
la programación pasa a `vercel.json`, que llama al endpoint con
`Authorization: Bearer $CRON_SECRET`.

Consecuencia a tener presente: **el plan Hobby de Vercel solo permite una
ejecución diaria**, contra los 30 minutos de `node-cron`. Si la frecuencia de
sincronización con el ERP se vuelve un requisito del negocio, la topología
serverless deja de servir.

`CRON_SECRET` es *fail-closed*: en producción, sin ella el endpoint responde
`503` en vez de ejecutar la sincronización sin autenticar.

Procedimiento paso a paso: **`docs/deploy-vercel.md`**.

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
