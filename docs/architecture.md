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
- **ProductImage** → url, alt, position, cascade delete
- **Variant** → SKU único, talla (US/CM/EUR), color, stock

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
| P2 | **Carga de imágenes** | Almacenamiento local vs Cloudinary vs S3 + Next.js Image |
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

```bash
# Base de datos
DATABASE_URL=postgresql://...

# Autenticación (better-auth)
AUTH_SECRET=...                   # Secret para firmar sesiones
BETTER_AUTH_SECRET=...            # Alias soportado por auth.ts
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Integración ERP (agnóstica — ver src/server/erp/)
ERP_PROVIDER="null"               # "null" | "alegra" | "siigo" | (futuro)
ALEGRA_EMAIL=""                   # Email de la cuenta Alegra
ALEGRA_API_KEY=""                 # API Key de Alegra
# Para Siigo u otro ERP, documentar sus variables aquí al agregar el adaptador
```

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

Variables pendientes de definir:
- `MERCADOPAGO_ACCESS_TOKEN`
- `RESEND_API_KEY` (o equivalente de email)
- `META_PIXEL_ID` / `META_ACCESS_TOKEN`
- `GA4_MEASUREMENT_ID`

## Capa ERP — Referencia Rápida

```
src/server/erp/
├── ports/erp.port.ts        ← IERPAdapter — LEER ANTES de tocar integraciones
├── adapters/
│   ├── null.adapter.ts      ← activo en dev (ERP_PROVIDER=null)
│   ├── alegra.client.ts     ← HTTP client Alegra (no usar directamente)
│   └── alegra.adapter.ts    ← implementación Alegra
├── erp.container.ts         ← getERPAdapter() — punto de entrada
├── erp.types.ts             ← ERPInvoice, ERPCustomer, ERPSyncResult, …
└── index.ts                 ← barrel: import { getERPAdapter } from "@/server/erp"
```

**Regla:** El código de negocio SOLO importa desde `@/server/erp` (el barrel).
Nunca importar adaptadores o clientes directamente.
