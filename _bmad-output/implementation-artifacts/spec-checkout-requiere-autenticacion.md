---
title: 'Checkout exclusivo para clientes autenticados'
type: 'feature'
created: '2026-07-25'
status: 'done'
baseline_commit: '265cc982c51bb72b86e90bf12eb0b195e6525392'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/REQUERIMIENTOS.md'
  - '{project-root}/docs/stories/story-002.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problema:** El checkout ofrece continuar como invitado, pero la decisión actual exige iniciar sesión o registrarse antes de diligenciar datos y crear un pedido. El registro también pierde el origen y `createOrder` admite llamadas sin sesión.

**Enfoque:** Mantener al visitante en `/checkout` con una pantalla de acceso y silueta que bloquee el formulario. Login y registro conservarán un retorno interno seguro; al autenticarse, el cliente volverá al checkout, y el Server Action rechazará pedidos sin sesión de cliente.

## Boundaries & Constraints

**Always:** Mostrar un placeholder mientras se resuelve la sesión; admitir solo sesiones `customer`; conservar y validar `callbackUrl=/checkout` entre login y registro; usar `Link`; mantener Zod → service → repository; preservar cambios locales ajenos.

**Ask First:** Cambiar usuarios, Better Auth, proxy, rutas adicionales, pasarela, carrito o campos del formulario.

**Never:** Permitir pedidos de invitado; aceptar callbacks externos o ambiguos; habilitar sesiones administrativas; tocar ERP; sobrescribir cambios existentes.

## I/O & Edge-Case Matrix

| Escenario | Entrada / Estado | Resultado esperado | Manejo de error |
|---|---|---|---|
| Sesión pendiente | Better Auth sin resolver | Placeholder estable, nunca el formulario | Mantener bloqueo |
| Visitante anónimo | `/checkout` sin sesión | Permanece allí y ve silueta y CTA de login/registro | No renderizar compra |
| Login o registro | `callbackUrl=/checkout` | Autenticación exitosa vuelve a `/checkout` | Error conserva el callback para reintentar |
| Cliente autenticado | Sesión `customer` válida | Se muestra el checkout normal sin selector de invitado | N/A |
| Sesión no cliente | `admin` u otro tipo | Pantalla bloqueada | No exponer formulario |
| Action directo | `createOrder` sin cliente | No llama `placeOrder` | Error tipado de autenticación |
| Callback hostil | URL externa, esquema, `//` o `\\` | Destino seguro por defecto | Nunca salir del sitio |

</frozen-after-approval>

## Code Map

- `src/app/checkout/page.tsx` — formulario cliente y opción de invitado actual.
- `src/components/checkout/CheckoutAuthGate.tsx` — nuevo bloqueo con silueta y enlaces.
- `src/app/checkout/actions.ts` — frontera que debe exigir sesión `customer`.
- `src/app/login/page.tsx` y `src/app/registro/page.tsx` — retorno post-autenticación.
- `src/lib/auth-redirect.ts` y test — política de callbacks internos.
- `e2e/auth.spec.ts` y `e2e/shop.spec.ts` — callback y gate anónimo.
- `REQUERIMIENTOS.md` y `docs/stories/story-002.md` — política de invitado obsoleta.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/auth-redirect.ts` y test — definir callback interno seguro.
- [x] `src/components/checkout/CheckoutAuthGate.tsx` — crear el bloqueo responsive y accesible con silueta, login y registro.
- [x] `src/app/checkout/page.tsx` — mostrar gate o checkout y eliminar el modo invitado.
- [x] `src/app/checkout/actions.ts` — autenticar antes de llamar servicios.
- [x] `src/app/login/page.tsx` y `src/app/registro/page.tsx` — preservar el retorno en todos los caminos.
- [x] `e2e/auth.spec.ts` y `e2e/shop.spec.ts` — comprobar gate y propagación del callback.
- [x] `REQUERIMIENTOS.md` y `docs/stories/story-002.md` — reemplazar la política de invitado.

**Acceptance Criteria:**
- Given un visitante sin sesión, when abre `/checkout`, then permanece allí, ve el acceso y no puede usar formulario, cupón ni pago.
- Given el CTA de login o registro desde el gate, when la autenticación termina correctamente, then la persona vuelve a `/checkout` y ve el formulario.
- Given una sesión `customer`, when abre `/checkout`, then ve el flujo existente sin “¿Ya tienes cuenta?” ni “continuar como invitado”.
- Given una llamada anónima a `createOrder`, when se procesa, then devuelve error y no crea pedido.
- Given móvil o desktop, when aparece el gate, then silueta, mensaje y CTA son accesibles y no desbordan.

## Design Notes

El gate pertenece a `/checkout`, no al proxy, para conservar el contexto. La garantía real queda en `createOrder`. No se elimina `placeOrder(userId: null)` porque puede tener otros consumidores; la política vive en la frontera del checkout.

## Verification

**Commands:**
- `pnpm vitest run src/lib/__tests__/auth-redirect.test.ts` — callbacks pasan.
- `pnpm eslint <archivos-modificados>` — sin errores nuevos.
- `pnpm exec tsc --noEmit` — sin errores nuevos.
- `pnpm exec playwright test e2e/auth.spec.ts e2e/shop.spec.ts --project=chromium` — gate y callback pasan.

**Manual checks (if no CLI):**
- Verificar en móvil y desktop: anónimo, login, registro, retorno y cliente autenticado.

## Suggested Review Order

**Compuerta de checkout**

- Decide entre silueta, bloqueo y formulario sin montar compra para visitantes.
  [`page.tsx:131`](../../src/app/checkout/page.tsx#L131)

- Presenta el contexto visual bloqueado y los dos retornos de autenticación.
  [`CheckoutAuthGate.tsx:22`](../../src/components/checkout/CheckoutAuthGate.tsx#L22)

- Impide pedidos anónimos o administrativos antes de validar y llamar servicios.
  [`actions.ts:52`](../../src/app/checkout/actions.ts#L52)

**Retorno seguro**

- Centraliza la validación de destinos internos y fallback seguro.
  [`auth-redirect.ts:11`](../../src/lib/auth-redirect.ts#L11)

- Conserva el checkout al iniciar sesión o pasar hacia registro.
  [`login/page.tsx:58`](../../src/app/login/page.tsx#L58)

- Conserva el retorno en auto-login, errores y navegación hacia login.
  [`registro/page.tsx:155`](../../src/app/registro/page.tsx#L155)

**Cobertura**

- Verifica rechazo, autorización customer e identidad tomada de la sesión.
  [`actions.test.ts:76`](../../src/app/checkout/actions.test.ts#L76)

- Recorre registro y login reales, vuelve al checkout y limpia datos temporales.
  [`auth.spec.ts:131`](../../e2e/auth.spec.ts#L131)

- Cubre anónimo, customer, admin, estado pendiente y viewport móvil.
  [`shop.spec.ts:58`](../../e2e/shop.spec.ts#L58)

**Decisión de negocio**

- Reemplaza explícitamente compra invitada por cuenta autenticada.
  [`REQUERIMIENTOS.md:54`](../../REQUERIMIENTOS.md#L54)

- Alinea criterios, tareas y definición de terminado del checkout.
  [`story-002.md:71`](../../docs/stories/story-002.md#L71)
