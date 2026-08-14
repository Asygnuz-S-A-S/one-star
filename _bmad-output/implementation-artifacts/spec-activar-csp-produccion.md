---
title: 'Activar Content Security Policy en producción'
type: 'feature'
created: '2026-08-14'
status: 'done'
baseline_commit: '16d1fc1be81fca8933e882c67cae027429247a91'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La aplicación no envía Content Security Policy y queda sin una defensa de navegador contra XSS e inyección de recursos antes de empezar a procesar pagos reales. La política estaba aplazada porque una configuración genérica bloquearía scripts y ventanas de ePayco, Sentry y recursos administrables.

**Approach:** Generar un nonce criptográfico por request desde `proxy.ts`, propagarlo a Next.js y a los scripts propios/terceros que lo necesitan, y enviar una CSP activa con permisos mínimos compatibles con las integraciones realmente utilizadas.

## Boundaries & Constraints

**Always:** Emitir la misma CSP en el request interno y en toda respuesta HTML, incluidos redirects de autenticación; usar un nonce nuevo por request; mantener `script-src` sin `'unsafe-inline'` en producción y admitir `'unsafe-eval'` solo en desarrollo; conservar la protección actual de `/admin` y `/cuenta`; permitir únicamente los orígenes necesarios de ePayco, Sentry, CARTO, Nominatim y recursos multimedia HTTPS; mantener `object-src 'none'`, `base-uri 'self'` y `frame-ancestors 'none'`; permitir `frame-ancestors 'self'` exclusivamente para `/?preview=true`; conservar estilos inline porque Motion, Leaflet, `next-themes` y el constructor visual los generan en runtime; documentar la decisión y sus orígenes.

**Ask First:** Migrar el checkout legado a ePayco Smart Checkout v2; agregar un endpoint de reportes CSP; activar solo `Content-Security-Policy-Report-Only`; habilitar scripts de tracking nuevos; cambiar la estrategia dinámica por SRI experimental; ampliar `script-src`, `connect-src` o `frame-src` a dominios no inventariados.

**Never:** Usar `script-src *`, `default-src *` o `'unsafe-inline'` para scripts en producción; reutilizar un nonce fijo; exponer secretos en la política; bloquear el checkout, Sentry, mapas, imágenes, videos o la vista previa administrativa; omitir CSP en redirects protegidos; relajar el iframe de preview para orígenes externos.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Página normal | Request HTML público o autenticado | CSP activa con nonce coincidente y `frame-ancestors 'none'` | No sirve HTML sin política |
| Checkout | Script legado de ePayco abre su lightbox | Script porta nonce y puede cargar/conectar/enmarcar solo orígenes ePayco inventariados | Los demás scripts externos quedan bloqueados |
| Observabilidad | Sentry cliente habilitado | Puede enviar eventos al host de ingestión sin habilitar scripts remotos | Sin DSN, la política sigue siendo válida |
| Preview | `/?preview=true` dentro del panel | Permite únicamente framing del mismo origen | Cualquier framing externo permanece bloqueado |
| Redirect auth | Acceso anónimo a `/admin/*` o `/cuenta/*` | Redirect conserva la CSP | La protección de sesión mantiene su comportamiento |
| Desarrollo | `NODE_ENV=development` | Añade `'unsafe-eval'` y permite HMR | Producción no hereda excepciones de desarrollo |
| Recursos externos | Imágenes, videos, tiles y geocodificación actuales | Cargan según su tipo sin ampliar scripts | Objetos/plugins y orígenes no declarados se bloquean |

</frozen-after-approval>

## Code Map

- `src/lib/content-security-policy.ts` -- constructor puro de directivas por nonce, entorno y modo preview.
- `src/lib/__tests__/content-security-policy.test.ts` -- pruebas de política productiva, desarrollo, preview e integraciones permitidas.
- `src/proxy.ts` -- genera el nonce, lo pasa al render, adjunta CSP y conserva redirects de autenticación.
- `src/proxy.test.ts` -- comprueba nonces por request, propagación interna, redirects y preview.
- `src/app/layout.tsx` y `src/app/providers.tsx` -- leen y distribuyen el nonce a `next-themes` y componentes cliente.
- `src/components/checkout/EpaycoButton.tsx` -- aplica el nonce al único script remoto ejecutable.
- `src/app/productos/[slug]/page.tsx` -- aplica el nonce al JSON-LD inline.
- `next.config.ts` y `docs/architecture.md` -- eliminan el estado “pendiente” y documentan la política activa.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/content-security-policy.ts` y su prueba -- construir mediante Red-Green-Refactor una política determinista y restrictiva.
- [x] `src/proxy.ts` -- incorporar CSP/nonce a respuestas normales y redirects sin cambiar autorización.
- [x] `src/app/layout.tsx`, `src/app/providers.tsx`, `src/components/checkout/EpaycoButton.tsx` y `src/app/productos/[slug]/page.tsx` -- propagar el nonce a todo script inline o externo controlado por la aplicación.
- [x] `next.config.ts` y `docs/architecture.md` -- registrar la activación, compatibilidad y excepciones deliberadas.

**Acceptance Criteria:**
- Given un build de producción, when se inspecciona la CSP, then `script-src` contiene nonce y `strict-dynamic` pero no `'unsafe-inline'` ni `'unsafe-eval'`.
- Given dos requests distintos, when pasan por el proxy, then reciben nonces diferentes tanto en el request interno como en su respuesta.
- Given ePayco, Sentry, mapas y recursos administrables actuales, when el navegador aplica la política, then cada integración dispone solo de las directivas necesarias para funcionar.
- Given un redirect de autenticación o el preview interno, when se procesa la respuesta, then conserva CSP y aplica el `frame-ancestors` correspondiente.

## Spec Change Log

- 2026-08-14: CSP con nonce implementada y verificada en build/servidor de producción local.
- 2026-08-14: Revisión independiente endureció límites del matcher y rutas auth, validación del nonce y fallback ePayco para CSP2; el escape JSON-LD preexistente quedó diferido.

## Design Notes

Se eligen nonces porque la tienda manejará pagos y la raíz ya declara `dynamic = "force-dynamic"`; no se pierde generación estática existente. `strict-dynamic` permite que el script de ePayco autorizado por nonce cargue sus dependencias, mientras se mantienen hosts explícitos como fallback. `style-src 'unsafe-inline'` es una excepción limitada a CSS y atributos de estilo; no habilita ejecución JavaScript.

## Verification

**Commands:**
- `pnpm exec vitest run src/lib/__tests__/content-security-policy.test.ts` -- prueba cada transición Red-Green de la política.
- `pnpm test` -- mantiene verde toda la suite.
- `pnpm exec eslint` sobre los archivos modificados -- sin errores nuevos.
- `pnpm build` -- confirma generación de nonces y compilación Next.js 16.

**Manual checks:**
- Levantar producción local, comprobar la cabecera en `/`, `/checkout`, un redirect `/admin` y `/?preview=true`, y revisar que el navegador no reporte bloqueos inesperados al abrir ePayco.

## Suggested Review Order

**Aplicación de la política**

- Entrada principal: genera, propaga y devuelve una CSP única por request.
  [`proxy.ts:10`](../../src/proxy.ts#L10)

- Constructor centraliza directivas, excepciones ambientales y allowlists inventariadas.
  [`content-security-policy.ts:7`](../../src/lib/content-security-policy.ts#L7)

- Límites exactos preservan autorización sin capturar rutas con prefijos parecidos.
  [`proxy.ts:43`](../../src/proxy.ts#L43)

- Matcher cubre todo HTML, incluidos 404, excluyendo solo recursos internos garantizados.
  [`proxy.ts:85`](../../src/proxy.ts#L85)

**Propagación del nonce**

- Layout obtiene el nonce reenviado antes de renderizar el árbol dinámico.
  [`layout.tsx:25`](../../src/app/layout.tsx#L25)

- Contexto cliente comparte nonce y protege el script de `next-themes`.
  [`providers.tsx:8`](../../src/app/providers.tsx#L8)

- Checkout autoriza explícitamente el cargador remoto de ePayco.
  [`EpaycoButton.tsx:30`](../../src/components/checkout/EpaycoButton.tsx#L30)

- JSON-LD de producto recibe el mismo nonce del documento.
  [`page.tsx:112`](../../src/app/productos/%5Bslug%5D/page.tsx#L112)

**Pruebas y documentación**

- Pruebas del proxy cubren matcher, nonces, redirects, límites y preview.
  [`proxy.test.ts:19`](../../src/proxy.test.ts#L19)

- Pruebas puras fijan política productiva, desarrollo, CSP2 e integraciones.
  [`content-security-policy.test.ts:5`](../../src/lib/__tests__/content-security-policy.test.ts#L5)

- Arquitectura registra permisos deliberados y procedimiento para nuevas integraciones.
  [`architecture.md:218`](../../docs/architecture.md#L218)
