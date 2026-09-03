---
title: 'Solicitar inicio de sesión únicamente al confirmar el pago'
type: 'feature'
created: '2026-07-31'
status: 'done'
baseline_commit: 'dd67f98b03272e48e8f4f9cb33697e9f28975dae'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/REQUERIMIENTOS.md'
  - '{project-root}/docs/stories/story-002.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-checkout-requiere-autenticacion.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El checkout bloquea al visitante apenas abre `/checkout`, antes de que pueda revisar el resumen, diligenciar el envío o calcular su total. La cuenta sigue siendo obligatoria, pero el usuario quiere solicitarla solo cuando la persona pulse el botón final para pagar.

**Approach:** Renderizar el checkout completo para visitantes y mover la compuerta existente al evento de confirmación. Si falta una sesión `customer`, se conservará temporalmente el borrador, aparecerá la silueta con login/registro y, al autenticarse, la persona volverá a `/checkout` sin que se haya creado ningún pedido.

## Boundaries & Constraints

**Always:** Mantener la cuenta obligatoria para crear pedidos; ejecutar la comprobación de sesión antes de validar o enviar la compra; conservar `callbackUrl=/checkout`; guardar únicamente campos no sensibles del formulario en `sessionStorage`; restaurar el borrador después del retorno; mantener el carrito persistente; tratar una sesión administrativa como no apta para comprar; conservar el rechazo `AUTH_REQUIRED` de la Server Action como garantía final.

**Ask First:** Implementar login dentro de un modal, cambiar Better Auth, permitir compra invitada, modificar la pasarela o persistir el borrador en la base de datos.

**Never:** Crear pedidos anónimos; confiar solo en la sesión del navegador; guardar claves, contraseñas o datos de pago; redirigir fuera del sitio; modificar productos, ERP o los cambios locales del worktree principal.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Visitante entra | `/checkout` sin sesión | Ve formulario, cupón, resumen y botón final | No mostrar gate todavía |
| Visitante confirma | Pulsa “Confirmar datos” | Ve silueta y CTA de login/registro | No validar ni crear pedido |
| Retorno autenticado | Login/registro exitoso con callback | Vuelve al formulario y recupera el borrador | Carrito y campos permanecen |
| Cliente confirma | Sesión `customer` válida | Valida y llama `createOrder` normalmente | Mostrar errores existentes |
| Sesión pendiente | Better Auth aún no responde | Formulario visible; confirmación temporalmente deshabilitada | No asumir anonimato |
| Sesión expirada | Cliente parecía válido pero Action responde `AUTH_REQUIRED` | Mostrar gate y conservar borrador | No mostrar error genérico |
| Sesión administrativa | `userType=admin` | Puede revisar checkout, pero al confirmar ve el gate | Nunca llamar `createOrder` |

</frozen-after-approval>

## Code Map

- `src/app/checkout/page.tsx` -- actualmente decide entre gate y formulario al cargar; moverá la decisión al submit y gestionará el borrador.
- `src/components/checkout/CheckoutAuthGate.tsx` -- silueta reutilizada después de pulsar pagar, con mensaje contextual.
- `src/app/checkout/actions.ts` y `actions.test.ts` -- mantienen la autorización server-side sin relajaciones.
- `e2e/shop.spec.ts` -- cubre visitante, sesión pendiente, customer, admin y móvil en el nuevo momento del gate.
- `e2e/auth.spec.ts` -- conserva el retorno seguro de login/registro a `/checkout`.
- `REQUERIMIENTOS.md` y `docs/stories/story-002.md` -- alinean la política escrita con la decisión de UX.

## Tasks & Acceptance

**Execution:**
- [x] `e2e/shop.spec.ts` -- escribir primero el escenario rojo: visitante ve checkout y solo encuentra el gate después de confirmar.
- [x] `src/app/checkout/page.tsx` -- renderizar siempre el formulario y bloquear el submit cuando la sesión no sea `customer`.
- [x] `src/app/checkout/page.tsx` -- conservar/restaurar el borrador no sensible y convertir `AUTH_REQUIRED` tardío en gate.
- [x] `src/components/checkout/CheckoutAuthGate.tsx` -- ajustar el mensaje a “inicia sesión para pagar”.
- [x] `e2e/shop.spec.ts` -- actualizar incrementalmente customer, admin, sesión pendiente y viewport móvil.
- [x] `REQUERIMIENTOS.md` y `docs/stories/story-002.md` -- documentar que la autenticación se solicita al confirmar, no al entrar.

**Acceptance Criteria:**
- Given un visitante, when abre `/checkout`, then puede revisar y diligenciar todo el checkout sin iniciar sesión.
- Given ese visitante, when pulsa el botón de confirmación, then aparece la silueta con login/registro y no se crea un pedido.
- Given que inicia sesión o se registra desde la silueta, when vuelve a `/checkout`, then recupera sus datos y puede continuar al pago.
- Given una llamada directa o una sesión expirada, when `createOrder` se ejecuta sin customer válido, then el servidor rechaza la creación.
- Given móvil o desktop, when aparece la compuerta al confirmar, then no desborda y mantiene accesibles ambos CTA.

## Design Notes

La compuerta cliente mejora el momento de la experiencia, pero no es la frontera de seguridad: `createOrder` continuará autenticando antes de validar y antes de invocar `placeOrder`. El borrador usa almacenamiento de sesión para sobrevivir la navegación de autenticación sin quedar persistido indefinidamente.

## Verification

**Commands:**
- `pnpm vitest run src/app/checkout/actions.test.ts src/lib/__tests__/auth-redirect.test.ts` -- autorización y callback permanecen verdes.
- `pnpm exec playwright test e2e/shop.spec.ts e2e/auth.spec.ts --project=chromium` -- nuevo flujo completo y retorno pasan.
- `pnpm exec eslint <archivos modificados>` -- sin errores nuevos.
- `pnpm exec tsc --noEmit` -- tipado correcto.

**Manual checks:**
- En móvil y desktop: llenar datos como anónimo, confirmar, entrar o registrarse, volver al checkout, comprobar borrador y continuar sin duplicar pedidos.

**Result:** 22 pruebas unitarias y 5 escenarios E2E de checkout pasan; ESLint, TypeScript y `pnpm build` completan correctamente. La revisión añadió versión/TTL, límites, vinculación por cuenta, limpieza inmediata, manejo de almacenamiento bloqueado, restauración real y revalidación del código de cupón. `@next/env` quedó declarado directamente para que una instalación limpia pueda tipar `e2e/auth.spec.ts`.

## Suggested Review Order

**Momento de autenticación**

- Decide entre checkout visible y gate según intención de confirmar y sesión customer.
  [`page.tsx:139`](../../src/app/checkout/page.tsx#L139)

- Intercepta el envío antes de validar o crear pedidos y conserva el borrador.
  [`page.tsx:263`](../../src/app/checkout/page.tsx#L263)

**Continuidad y privacidad**

- Versiona, limita y guarda temporalmente datos ligados al email de retorno.
  [`checkout-draft.ts:100`](../../src/lib/checkout-draft.ts#L100)

- Descarta borradores expirados, corruptos o pertenecientes a otra cuenta.
  [`checkout-draft.ts:127`](../../src/lib/checkout-draft.ts#L127)

- Restaura campos, elimina PII almacenada y revalida el cupón en servidor.
  [`page.tsx:188`](../../src/app/checkout/page.tsx#L188)

**Experiencia de acceso**

- Presenta la silueta al pagar y advierte cuando no puede conservar datos.
  [`CheckoutAuthGate.tsx:70`](../../src/components/checkout/CheckoutAuthGate.tsx#L70)

**Cobertura y contrato**

- Recorre visitante, guardado real, retorno, customer, admin, espera y móvil.
  [`shop.spec.ts:114`](../../e2e/shop.spec.ts#L114)

- Protege TTL, propietario, corrupción, cupón y almacenamiento bloqueado.
  [`checkout-draft.test.ts:27`](../../src/lib/__tests__/checkout-draft.test.ts#L27)

- Formaliza que la cuenta se exige al confirmar y no al entrar.
  [`story-002.md:71`](../../docs/stories/story-002.md#L71)

- Declara la dependencia directa usada por las pruebas de autenticación.
  [`package.json:56`](../../package.json#L56)
