# Auditoría — One Star E-Commerce

**Fecha:** 2026-06-12 · **Rama:** `develop` · **Alcance:** seguridad, arquitectura, calidad de código, tests y dependencias.

## Resumen ejecutivo

El proyecto tiene una base arquitectónica sólida (patrón Repository→Service bien aplicado, `server-only` consistente, `.env` fuera de git, bcrypt para contraseñas). Sin embargo, **no está listo para producción**: existen 4 hallazgos críticos de seguridad/negocio, el build de TypeScript está roto (17 errores) y la cobertura de tests es 0 % contra una regla propia de ≥80 %.

| Severidad | Cantidad |
|---|---|
| 🔴 Crítica | 4 |
| 🟠 Alta | 4 |
| 🟡 Media | 7 |
| 🟢 Baja | 3 |

---

## 🔴 Hallazgos críticos

### C1. Server actions de admin sin verificación de sesión ni rol
**Archivos:** `src/app/admin/productos/actions.ts`, `admin/pedidos/actions.ts`, `admin/cupones/actions.ts`, `admin/banners/actions.ts`, `admin/clientes/abandonados/actions.ts`

Ninguna server action de admin valida la sesión. El `proxy.ts` solo protege la **navegación** a `/admin/*`, pero las server actions son endpoints POST invocables directamente con su action ID desde cualquier ruta pública. Un atacante sin autenticación puede crear/editar/borrar productos, cambiar estados de pedidos, crear cupones y manipular banners.

**Fix:** al inicio de cada action, verificar sesión y `userType === "admin"`:

```ts
const session = await auth.api.getSession({ headers: await headers() })
if (!session || (session.user as { userType?: string }).userType !== "admin") {
  return { success: false, error: "No autorizado." }
}
```
Idealmente extraer un helper `requireAdmin()` en `src/server/` y llamarlo en todas las actions de admin. (`cuenta/actions.ts` sí valida sesión — usar como referencia, aunque le falta validar `userType`.)

### C2. Checkout confía en precios enviados por el cliente
**Archivos:** `src/app/checkout/actions.ts` (`createOrder`), `src/server/services/order.service.ts` (`placeOrder`)

`createOrder` recibe `unitPrice`, `subtotal`, `shippingCost` y `total` del cliente y los persiste sin recalcular. Cualquiera puede comprar a $1. Además no se valida con Zod (viola la regla #4 del proyecto).

**Fix:** en `placeOrder`, recuperar precios reales desde `product.repository` por `productId/variantId`, recalcular subtotal/envío/total en servidor, y validar el payload con un `checkoutSchema` Zod.

### C3. better-auth configurado con hash de identidad (riesgo de contraseñas en texto plano)
**Archivo:** `src/lib/auth.ts` (línea 25): `hash: (password) => password`

`emailAndPassword.enabled: true` expone el endpoint público `/api/auth/sign-up/email`. Si alguien lo invoca (no necesita UI), better-auth llamará a `hash()` y guardará la **contraseña en texto plano** en `ba_account`. El flujo de registro propio (`registerUser`) sí usa bcrypt, pero el endpoint de BA queda abierto.

**Fix:** implementar `hash` con bcrypt (`hashSync(password, 10)`) o deshabilitar el sign-up de better-auth (`emailAndPassword: { disableSignUp: true }`) ya que el registro va por `registerCustomer`.

### C4. Los pedidos no descuentan stock ni guardan la variante (talla)
**Archivos:** `src/server/services/order.service.ts`, `prisma/schema.prisma` (`OrderItem`)

- `placeOrder` no valida disponibilidad ni decrementa `Variant.stock` → sobreventa garantizada.
- `OrderItem` no tiene relación con `Variant`: el checkout envía `variantId`/`sku` pero se descartan. **Es imposible saber qué talla compró el cliente.** Esto contradice `docs/architecture.md`, que afirma que `OrderItem` guarda "snapshot de precio, quantity, variante".

**Fix:** agregar `variantId` + snapshot de talla/SKU a `OrderItem` (migración), y en `placeOrder` usar una transacción Prisma que valide y decremente stock.

---

## 🟠 Hallazgos altos

### A1. El build de TypeScript está roto: 17 errores
`npx tsc --noEmit` reporta 17 errores en 12 archivos. `next build` fallará. Causas principales:

- **Zod v4:** `parsed.error.errors` ya no existe → usar `parsed.error.issues` (`admin/productos/actions.ts`, `registro/actions.ts`, `cuenta/actions.ts`, `product.validator.ts`).
- **Motion 12:** los variants con `ease: string` no tipan (`checkout/page.tsx`, `Header.tsx`, `RevenueChart.tsx`) → usar `ease: "easeOut" as const` o tipos `Easing`.
- `BannerDTO` vs `BannerRow` (falta `createdAt`), `auth.ts`/`auth-client.ts`/`proxy.ts` con incompatibilidades de tipos.

### A2. Cobertura de tests: 0 %
No hay ni un archivo de test ni framework configurado (sin vitest/jest en `devDependencies`, sin script `test`). La regla #6 del proyecto exige ≥80 % en servicios y repositorios. Prioridad: `order.service`, `coupon.service`, `user.service` (los que tocan dinero y credenciales).

### A3. Configuración de producción insegura en Docker
**Archivo:** `docker-compose.yml`

- El servicio `app` corre con `NODE_ENV: production` pero **sin `AUTH_SECRET`** → better-auth queda sin secreto explícito.
- Credenciales de Postgres hardcodeadas (`onestar_pass`) en lugar de variables/secrets.
- **Adminer expuesto en el puerto 8080** sin restricción: en un despliegue real es acceso directo a la BD.

### A4. Enumeración de usuarios sin límite de tasa
**Archivo:** `src/app/api/auth/check-email/route.ts`

Endpoint público GET que confirma si un email está registrado, sin rate limiting ni protección. Permite recolectar la base de clientes y preparar credential stuffing. No hay rate limiting en ningún punto de la app (login incluido). **Fix:** habilitar el rate limiting integrado de better-auth y aplicar respuesta genérica o throttling a `check-email`.

---

## 🟡 Hallazgos medios

1. **Actions sin Zod** (regla #4): `admin/cupones/actions.ts` y `admin/banners/actions.ts` parsean `FormData` a mano con casts; `checkout/actions.ts` confía en la interfaz TS (no valida en runtime). Solo productos y usuarios tienen validators.
2. **Los cupones nunca se aplican:** existe CRUD de cupones y `Order.couponId` en docs, pero el checkout no tiene campo de cupón ni `placeOrder` lo recibe. Funcionalidad muerta.
3. **`JSON.parse` sin try/catch** en `extractFormData` (`admin/productos/actions.ts:45-47`): un payload malformado lanza excepción no controlada.
4. **`updateOrderStatus` acepta `status: string`** sin validar contra el enum `OrderStatus` → error de Prisma en runtime con valores inválidos.
5. **Estado del carrito duplicado:** los componentes usan `CartContext` (React Context), pero `src/store/cart.store.ts` (Zustand) existe sin que ningún componente lo consuma. `docs/architecture.md` declara Zustand como la decisión tomada (#5). Decidir uno y borrar el otro.
6. **Vulnerabilidades npm:** 1 high + 3 moderate. `next` 16.2.6 → 16.2.9 y `better-auth` 1.6.15 → 1.6.18 resuelven las moderate de runtime; la high (esbuild) es solo tooling de desarrollo.
7. **Dos lockfiles conviven:** `package-lock.json` y `pnpm-lock.yaml` (docs dicen pnpm). Borrar el de npm para evitar instalaciones inconsistentes.

---

## 🟢 Hallazgos bajos

1. **JSON-LD sin escape:** `productos/[slug]/page.tsx:68` inyecta `JSON.stringify(jsonLd)` en `dangerouslySetInnerHTML`. Si un admin guarda `</script>` en un campo de producto, hay XSS. Escapar con `.replace(/</g, "\\u003c")`.
2. **Dependencia muerta:** `kysely` está en `dependencies` y no se importa en ninguna parte.
3. **Basura en el repo:** carpeta literal `{output_folder}/` en la raíz (bug de template) y `.DS_Store`; agregar a `.gitignore` y limpiar. `cookieCache` de 5 min retrasa la revocación de sesiones (aceptable, pero documentarlo).

---

## ✅ Lo que está bien

- Patrón **Repository → Service → Action** aplicado consistentemente en los 11 dominios; cero acceso a Prisma fuera de `src/server/`.
- **`server-only`** presente en los 23 módulos de servidor + `auth.ts` (regla #5 cumplida).
- `.env` correctamente fuera de git (verificado con `git ls-files`).
- Contraseñas con **bcrypt (cost 10)** en el flujo de registro propio.
- `proxy.ts` protege navegación de `/admin` y `/cuenta` con verificación de `userType`.
- `/api/cuenta/pedidos` valida sesión y tipo de usuario correctamente — el patrón a replicar en C1.
- `docs/architecture.md` es de calidad y mayormente fiel al código (salvo lo señalado en C4 y el punto 5 de medios).

## Plan de acción sugerido

| Orden | Acción | Hallazgos |
|---|---|---|
| 1 | Helper `requireAdmin()` + aplicarlo en todas las actions de admin | C1 |
| 2 | Recalcular precios/stock en servidor dentro de transacción; agregar `variantId` a `OrderItem` | C2, C4 |
| 3 | bcrypt en `hash` de better-auth o deshabilitar su sign-up | C3 |
| 4 | Corregir los 17 errores TS (`.errors`→`.issues`, tipos de Motion) | A1 |
| 5 | `pnpm up next better-auth` + borrar `package-lock.json` y `kysely` | M6, M7, B2 |
| 6 | Configurar vitest y cubrir `order/coupon/user.service` | A2 |
| 7 | Secrets por variables en docker-compose; quitar Adminer de prod | A3 |
| 8 | Rate limiting (better-auth) y endurecer `check-email` | A4 |
