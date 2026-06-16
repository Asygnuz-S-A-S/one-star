# Plan de Acción — Remediación Auditoría

> **Instrucciones para el agente:** Ejecutar las etapas **en orden**. No avanzar a la siguiente etapa sin cumplir los criterios de verificación de la actual. Leer `docs/architecture.md` y `docs/audit-report.md` antes de empezar. Respetar las reglas de `CLAUDE.md` (patrón Repository→Service→Action, Zod en `src/server/validators/`, `server-only`). Hacer un commit por etapa con prefijo `fix(audit-eN):`.

---

## Etapa 0 — Arreglar el build (A1)

El build está roto con 17 errores de TypeScript. Nada se puede verificar hasta arreglarlo.

**Tareas:**
1. Reemplazar `parsed.error.errors` por `parsed.error.issues` (API de Zod v4) en: `src/app/admin/productos/actions.ts`, `src/app/registro/actions.ts`, `src/app/cuenta/actions.ts`, `src/server/validators/product.validator.ts`.
2. Corregir los tipos de Motion 12 en `src/app/checkout/page.tsx`, `src/components/Header.tsx`, `src/components/admin/charts/RevenueChart.tsx` (usar `Easing` tipado, ej. `ease: "easeOut" as const`).
3. Corregir `BannerDTO` vs `BannerRow` en `src/app/admin/banners/page.tsx` (falta `createdAt`).
4. Resolver los errores restantes en `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/proxy.ts`, `src/components/admin/ProductForm.tsx`.

**Verificación:** `npx tsc --noEmit` → 0 errores. `pnpm lint` sin errores nuevos.

---

## Etapa 1 — Autorización en server actions de admin (C1)

**Tareas:**
1. Crear `src/server/auth/require-admin.ts` con `server-only`:
   - `requireAdmin()`: obtiene sesión con `auth.api.getSession({ headers: await headers() })`, lanza/retorna error si no hay sesión o `userType !== "admin"`.
   - `requireCustomer()`: igual pero exige `userType === "customer"`.
2. Llamar `requireAdmin()` al inicio de **todas** las actions en: `src/app/admin/productos/actions.ts`, `admin/pedidos/actions.ts`, `admin/cupones/actions.ts`, `admin/banners/actions.ts`, `admin/clientes/abandonados/actions.ts`. Retornar `{ success: false, error: "No autorizado." }` cuando falle.
3. En `src/app/cuenta/actions.ts`, además de la sesión, validar `userType === "customer"` (usar `requireCustomer()`).

**Verificación:** `npx tsc --noEmit` limpio. Toda action de admin tiene la verificación como primera instrucción (confirmar con grep).

---

## Etapa 2 — Checkout seguro: precios de servidor, stock y variante (C2 + C4)

**Tareas:**
1. **Migración Prisma:** agregar a `OrderItem` los campos `variantId String?` con relación a `Variant`, y snapshots `sku String?` y `size String?`. Ejecutar `prisma migrate dev --name order-item-variant`.
2. Crear `src/server/validators/checkout.validator.ts` con `checkoutSchema` (Zod) que valide todo el payload del checkout: email, datos de envío, `shippingMethod`, `paymentMethod`, items con `productId`, `variantId`, `quantity` (entero ≥1). **No aceptar precios del cliente.**
3. Reescribir `placeOrder` en `src/server/services/order.service.ts`:
   - Dentro de `prisma.$transaction`:
     a. Cargar productos y variantes reales por `productId`/`variantId`.
     b. Validar stock disponible por variante (error claro si no alcanza).
     c. Calcular `unitPrice` desde la BD (usar `salePrice` si `isOnSale`), subtotal, costo de envío (tarifa definida en servidor según `shippingMethod`) y `total`.
     d. Decrementar `Variant.stock`.
     e. Crear `Order` + `OrderItem` con snapshot de `sku`, `size`, `unitPrice`.
4. Actualizar `src/app/checkout/actions.ts` para validar con `checkoutSchema` y pasar solo datos, nunca precios. Si hay sesión de customer, asociar `userId` al pedido.
5. Actualizar la UI de checkout/success solo si algo se rompe por el cambio de contrato.

**Verificación:** `npx tsc --noEmit` limpio. `prisma migrate dev` aplicada. Crear un pedido de prueba (seed + script o test) y confirmar que el total se calcula en servidor y el stock decrementa.

---

## Etapa 3 — Endurecer better-auth (C3 + A4)

**Tareas:**
1. En `src/lib/auth.ts`:
   - Reemplazar `hash: (password) => password` por hash real con bcryptjs (`hashSync(password, 10)`).
   - Deshabilitar el sign-up público de better-auth (`emailAndPassword: { disableSignUp: true }`) — el registro va por `registerCustomer`.
   - Habilitar el rate limiting integrado de better-auth (`rateLimit: { enabled: true, ... }`) con límites estrictos en endpoints de auth.
2. En `src/app/api/auth/check-email/route.ts`: agregar throttling simple (ej. limitar por IP en memoria o mover la verificación al flujo de registro y eliminar el endpoint si la UI lo permite). Documentar la decisión.

**Verificación:** `npx tsc --noEmit` limpio. `POST /api/auth/sign-up/email` rechazado. Login admin y customer siguen funcionando (probar manualmente o con test de integración).

---

## Etapa 4 — Validación y robustez de actions (M1, M3, M4)

**Tareas:**
1. Crear `src/server/validators/coupon.validator.ts` y `banner.validator.ts` (Zod). Usarlos en `admin/cupones/actions.ts` y `admin/banners/actions.ts` en lugar del parseo manual con casts.
2. En `extractFormData` (`admin/productos/actions.ts`): envolver los `JSON.parse` en try/catch y retornar error de validación legible.
3. En `updateOrderStatus` (`admin/pedidos/actions.ts`): validar `status` contra el enum `OrderStatus` con `z.nativeEnum(OrderStatus)` antes de llamar al servicio.

**Verificación:** `npx tsc --noEmit` limpio. Ninguna action parsea FormData sin pasar por un validator de `src/server/validators/`.

---

## Etapa 5 — Dependencias y limpieza (M5, M6, M7, B2, B3)

**Tareas:**
1. `pnpm up next@latest better-auth@latest` (dentro de la misma major: next 16.2.x, better-auth 1.6.x). Correr `pnpm audit` y confirmar que desaparecen las vulnerabilidades moderate de runtime.
2. Eliminar `package-lock.json` (el proyecto usa pnpm). Eliminar `kysely` de dependencies.
3. Resolver la duplicación de estado del carrito: los componentes usan `CartContext`; **decisión:** migrar a Zustand (`cart.store.ts`) según `docs/architecture.md` decisión #5, O actualizar el doc para reflejar Context y borrar el store muerto. Elegir lo que menos riesgo tenga y dejar `docs/architecture.md` consistente.
4. Borrar la carpeta `{output_folder}/` de la raíz y agregar `.DS_Store` y `{output_folder}/` a `.gitignore`.
5. Escapar el JSON-LD en `src/app/productos/[slug]/page.tsx`: `JSON.stringify(jsonLd).replace(/</g, "\\u003c")`.

**Verificación:** `pnpm install` limpio con un solo lockfile, `pnpm audit` sin moderate/high de runtime, `npx tsc --noEmit` limpio, build `pnpm build` exitoso.

---

## Etapa 6 — Tests (A2)

**Tareas:**
1. Instalar y configurar vitest (`vitest`, `@vitest/coverage-v8`). Agregar scripts `test` y `test:coverage` a `package.json`.
2. Escribir tests unitarios mockeando repositorios (el patrón Repository existe justo para esto):
   - `order.service`: cálculo de totales en servidor, rechazo por stock insuficiente, decremento de stock, snapshot de variante.
   - `user.service`: registro hashea con bcrypt, `emailExists`.
   - `coupon.service`: creación, código duplicado, toggle.
   - `product.service`: create/update/delete, búsqueda.
   - `require-admin`: rechaza sin sesión, rechaza customer, acepta admin.
3. Tests de validators (checkout, coupon, banner, product, user): casos válidos e inválidos.
4. Alcanzar **≥80 % de cobertura en `src/server/services/` y `src/server/repositories/`** (regla #6 de CLAUDE.md). Para repositorios, tests de integración contra la BD de docker-compose o mock de Prisma.

**Verificación:** `pnpm test:coverage` → ≥80 % en services y repositories, todos los tests en verde.

---

## Etapa 7 — Configuración de producción (A3)

**Tareas:**
1. `docker-compose.yml`:
   - Pasar `POSTGRES_PASSWORD`, `DATABASE_URL` y `AUTH_SECRET` por variables de entorno (`${VAR}`) con archivo `.env` de compose; nunca hardcodeadas.
   - Agregar `AUTH_SECRET` y `NEXT_PUBLIC_APP_URL` al servicio `app`.
   - Mover `adminer` a un profile opcional (`profiles: ["dev"]`) para que no arranque en producción.
2. Actualizar `.env.example` con todas las variables requeridas (`AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`) y documentarlas en la sección de variables de entorno de `docs/architecture.md` (regla #7 de CLAUDE.md).
3. Rotar el `AUTH_SECRET` actual de `.env` local (quedó expuesto en revisiones).

**Verificación:** `docker compose config` sin secretos hardcodeados; `docker compose up` (sin profile dev) levanta db + app sin adminer; app arranca con `AUTH_SECRET` presente.

---

## Etapa 8 — Verificación final

1. `npx tsc --noEmit` → 0 errores.
2. `pnpm lint` → limpio.
3. `pnpm test:coverage` → ≥80 % en services/repositories.
4. `pnpm build` → exitoso.
5. Smoke test manual: registro, login customer, login admin, crear producto (admin), checkout completo con stock decrementado, intento de action de admin sin sesión rechazado.
6. Actualizar `docs/audit-report.md` marcando cada hallazgo como ✅ resuelto con referencia al commit.
