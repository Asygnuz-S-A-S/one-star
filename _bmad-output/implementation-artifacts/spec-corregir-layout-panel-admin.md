---
title: 'Aislar el layout del panel administrador'
type: 'bugfix'
created: '2026-08-31'
status: 'done'
baseline_commit: 'a958c0d7fd137bfaa44e77680633e3a14fa9e958'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/REQUERIMIENTOS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Las rutas `/admin` renderizan también el header, el espaciado y la región principal de la tienda pública. Esto crea dos regiones `<main>` y, en móvil, dos botones “Abrir menú”, con conflictos de foco, capas y navegación.

**Approach:** Introducir una frontera de presentación dependiente de la ruta que monte el chrome público y su espaciador únicamente fuera de `/admin`, mientras el layout raíz conserva providers y datos compartidos sin duplicar landmarks.

## Boundaries & Constraints

**Always:** Mantener intactos autenticación, sidebar, hotkeys y páginas administrativas; conservar header, banner, carrito y compensación de altura en todas las rutas públicas; usar `usePathname` en un Client Component pequeño conforme a Next.js 16; dejar una sola región `<main>` en el admin; cubrir `/admin`, subrutas y `/admin/login`.

**Ask First:** Reorganizar todo `src/app` con route groups o cambiar la estrategia global de providers/layouts.

**Never:** Leer pathname desde un Server Component, ocultar el conflicto solo con CSS, duplicar consultas de datos, modificar modelos/BD o afectar rutas que solo empiezan de forma parecida como `/administrar`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Admin autenticado | `/admin` o `/admin/...` | Solo chrome administrativo, un `<main>` y un menú móvil | El contenido admin conserva su error boundary |
| Login administrativo | `/admin/login` | Formulario sin header, banner, carrito ni espaciador público | Login continúa accesible sin sesión |
| Tienda pública | `/` o cualquier ruta no admin | Header, banner, carrito y espaciador conservados | Datos faltantes usan los fallbacks actuales |
| Prefijo parecido | `/administrar` | Se trata como ruta pública | La detección exige segmento `/admin` exacto |

</frozen-after-approval>

## Code Map

- `src/app/layout.tsx` -- compone providers, datos globales y actualmente agrega header, padding y `<main>` público a todas las rutas.
- `src/components/Header.tsx` -- chrome público existente; ya es Client Component y consume `usePathname` para enlaces activos.
- `src/app/admin/layout.tsx` -- chrome administrativo y único `<main>` que debe quedar en rutas protegidas.
- `src/components/PublicSiteFrame.tsx` -- nueva frontera cliente que decidirá chrome y landmark según la ruta.
- `src/lib/public-site-route.ts` -- regla pura y testeable de pertenencia a `/admin`.
- `e2e/admin-panel-audit.spec.ts` -- regresión de landmarks y menú móvil en producción/local.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/public-site-route.test.ts` -- probar primero raíz, trailing slash, subrutas y prefijos parecidos.
- [x] `src/lib/public-site-route.ts` -- implementar detección exacta de rutas administrativas.
- [x] `src/components/PublicSiteFrame.tsx` -- montar Header, espaciador y `<main>` solo para tienda; usar contenedor neutral en admin.
- [x] `src/app/layout.tsx` -- retirar padding y `<main>` globales; entregar chrome, datos y children a la frontera sin repetir consultas.
- [x] `src/app/admin/layout.tsx` -- conservar un único `<main>` tanto en login/sin sesión como en el panel autenticado.
- [x] `e2e/admin-panel-audit.spec.ts` -- exigir ausencia completa del header/espaciador, un menú y un `<main>` en admin; conservarlos en público.

**Acceptance Criteria:**
- Given una ruta `/admin`, when se renderiza, then no existen “Menú principal”, “Carrito de compras” ni banner público.
- Given admin móvil, when carga, then existe exactamente un botón “Abrir menú” y abre el sidebar administrativo.
- Given cualquier pantalla admin autenticada, when se inspeccionan landmarks, then existe exactamente una región `<main>`.
- Given una ruta pública, when carga, then conserva header fijo y espacio superior equivalente al estado del banner.

## Spec Change Log

- **Iteración 1 — landmark público perdido:** La revisión detectó que varias páginas públicas, incluida Inicio, dependían del `<main>` raíz; retirarlo las dejaba sin landmark. Se corrigieron Code Map, tareas y Design Notes para que la frontera renderice `<main>` únicamente en rutas públicas y un `<div>` neutral en admin. **Known-bad evitado:** tienda pública sin región principal accesible. **KEEP:** matcher exacto de segmento `/admin`, alturas actuales del header, ausencia total de chrome público en admin y pruebas RED/GREEN.
- **Iteración 2 — landmark del login administrativo:** La revisión de bordes detectó que `AdminLayout` devolvía un fragmento cuando no había sesión, dejando `/admin/login` sin `<main>` después de aislar el chrome público. Se hizo responsable a `AdminLayout` del landmark también en ese estado y se añadió la aserción E2E correspondiente.

## Design Notes

La decisión se mantiene en un Client Component pequeño porque Next.js 16 no permite leer pathname desde Server Components. La frontera recibe `children`: en tienda renderiza Header, espaciador y `<main className="flex-1">`; en admin renderiza solo `<div className="flex-1">`, dejando como único landmark el `<main>` de `AdminLayout`, tanto con sesión como en el login. Así Inicio y otras páginas públicas que dependían del landmark raíz conservan su semántica.

## Verification

**Commands:**
- `pnpm exec vitest run src/lib/public-site-route.test.ts` -- expected: regla de rutas en verde tras demostrar RED.
- `pnpm exec eslint src/app/layout.tsx src/components/PublicSiteFrame.tsx src/lib/public-site-route.ts src/lib/public-site-route.test.ts e2e/admin-panel-audit.spec.ts` -- expected: sin errores.
- `pnpm exec tsc --noEmit` -- expected: sin errores.
- `pnpm exec playwright test e2e/admin-panel-audit.spec.ts --project=chromium --grep 'layout|móvil'` -- expected: admin con un solo chrome.

## Suggested Review Order

**Frontera de presentación**

- Decide una sola vez qué chrome y landmark corresponden a cada zona.
  [`PublicSiteFrame.tsx:13`](../../src/components/PublicSiteFrame.tsx#L13)

- Integra la frontera sin duplicar providers ni consultas existentes.
  [`layout.tsx:48`](../../src/app/layout.tsx#L48)

- Mantiene un único landmark administrativo con y sin sesión.
  [`admin/layout.tsx:24`](../../src/app/admin/layout.tsx#L24)

**Clasificación de rutas**

- Exige el segmento `/admin` exacto y admite todas sus subrutas.
  [`public-site-route.ts:1`](../../src/lib/public-site-route.ts#L1)

**Regresiones**

- Cubre login y tienda pública sin depender de credenciales administrativas.
  [`admin.spec.ts:9`](../../e2e/admin.spec.ts#L9)

- Recorre rutas autenticadas y verifica chrome, menú y landmarks.
  [`admin-panel-audit.spec.ts:14`](../../e2e/admin-panel-audit.spec.ts#L14)

- Protege los límites exactos del matcher con pruebas unitarias.
  [`public-site-route.test.ts:5`](../../src/lib/public-site-route.test.ts#L5)
