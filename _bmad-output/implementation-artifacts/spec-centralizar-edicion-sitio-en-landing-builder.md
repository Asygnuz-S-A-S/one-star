---
title: 'Centralizar la edición visual del sitio en Landing Builder'
type: 'refactor'
created: '2026-08-10'
status: 'done'
baseline_commit: 'a05a29dcda9169b48cd11beff32c9819ef119778'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/REQUERIMIENTOS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El admin expone cinco editores independientes —Navegación, Grilla de Inicio, Banners, Banner Superior y Logos— que deben administrarse desde Landing Builder. La duplicidad dispersa el flujo de edición.

**Approach:** Trasladar allí, sin perder opciones, las funciones faltantes; retirar accesos duplicados y redirigir las rutas antiguas al constructor.

## Boundaries & Constraints

**Always:** Permitir directamente en Landing Builder crear, editar, ordenar, activar/desactivar y eliminar cuando corresponda. Reutilizar formularios, acciones, servicios y modelos actuales; conservar previsualización, validación y autorización; respetar Server Action → Service → Repository; dejar un único acceso de diseño en el sidebar.

**Ask First:** Modificar Prisma, eliminar datos o retirar módulos ajenos al diseño visual.

**Never:** Eliminar datos, copiarlos a `LandingSection.config`, romper URLs públicas, conservar editores alternos o introducir acceso directo a Prisma en componentes/actions.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Edición centralizada | Admin abre Landing Builder | Administra los cinco contenidos y ve el resultado sin salir | Conserva datos y muestra el error |
| URL antigua | Admin abre una de las cinco rutas visuales retiradas | Es redirigido a `/admin/landing-builder` | No se renderiza ni queda accesible el editor anterior |
| Grilla vacía | No existen bloques de grilla | Landing Builder muestra estado vacío y permite crear el primer bloque | Un fallo de creación no agrega un bloque optimista falso |

</frozen-after-approval>

## Code Map

- `src/components/admin/{AdminSidebar,VisualBuilderContainer,LandingBuilderList}.tsx` -- menú y constructor central.
- `src/app/admin/landing-builder/page.tsx` -- carga inicial.
- `src/app/admin/grilla/*` y `src/server/services/home-grid.service.ts` -- CRUD actual de grilla.
- `src/app/admin/{navegacion,banners,banner,logos}/page.tsx` -- editores por retirar.
- `src/components/admin/{NavigationManager,LogoManager,BannerManager}.tsx` -- capacidades antiguas auditadas.
- `src/app/admin/configuracion/page.tsx` -- falsa barra de anuncios duplicada.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/admin/AdminSidebar.tsx` -- dejar solo Landing Builder en “Diseño y Landing”.
- [x] Actions/componentes compartidos -- reutilizar CRUD de grilla y banners fuera de las rutas antiguas.
- [x] Landing Builder -- cargar todos los logos/bloques; integrar CRUD de grilla; completar logos; permitir URLs libres/editables; agregar etiqueta CTA; conservar el formulario actual de banners.
- [x] Rutas antiguas -- redirigir a Landing Builder y eliminar UI sin consumidores.
- [x] `src/app/admin/configuracion/page.tsx` -- retirar solo la falsa “Barra de anuncios”; conservar configuración general.
- [x] Atajos y ayuda -- dirigir Banners a Landing Builder.

**Acceptance Criteria:**
- Given el sidebar, when carga, then ofrece solo Landing Builder para diseño.
- Given Landing Builder, when se administra cualquiera de las cinco áreas, then conserva las operaciones previas y actualiza la previsualización sin salir.
- Given una URL antigua, when carga, then redirige a `/admin/landing-builder`.
- Given el resto del admin, when termina el cambio, then conserva su comportamiento.

## Spec Change Log

## Design Notes

Los modelos actuales continúan siendo la fuente canónica. La auditoría estableció este plan de no duplicación:

| Área | Ya existe en Landing Builder | Falta trasladar o completar |
|------|------------------------------|-----------------------------|
| Banners del hero | Mismo formulario completo para crear/editar y acción de eliminar | Toggle rápido de estado; mover formulario/acciones fuera de la ruta antigua |
| Banner superior | Ticker con múltiples mensajes/URLs, colores y estado | Etiqueta global del CTA y normalización visual del fallback antiguo |
| Navegación | Crear, ordenar, renombrar, activar, marcar SALE y eliminar; además diseña el header | Editar URL existente y admitir URL libre al crear |
| Logos | Carga directa de principal desktop y mobile | Reutilizar galería completa: recorte, múltiples versiones, large/footer, tema, principal y eliminación |
| Grilla de inicio | Configuración visual de la sección | Reutilizar CRUD de sus bloques: texto, enlace, color, emoji, texto oscuro, posición y estado |

No se copia ni migra contenido. Lo compartido se mueve fuera de rutas antiguas antes de retirar sus interfaces.

## Verification

**Commands:**
- `pnpm lint && pnpm test && pnpm build` -- expected: todo en verde.
- `rg -n 'href: "/admin/(navegacion|grilla|banners|banner|logos)"' src/components/admin/AdminSidebar.tsx` -- expected: sin coincidencias.

**Manual checks (if no CLI):**
- Editar cada área desde Landing Builder y probar las cinco redirecciones.

## Suggested Review Order

### Entrada y composición

1. [`landing-builder/page.tsx`](../../src/app/admin/landing-builder/page.tsx#L65) — Carga aislada de datos y acciones del constructor.
2. [`VisualBuilderContainer.tsx`](../../src/components/admin/VisualBuilderContainer.tsx#L22) — Divide editor y previsualización; recupera fallos al refrescar.
3. [`LandingBuilderList.tsx`](../../src/components/admin/LandingBuilderList.tsx#L151) — Centraliza los cinco editores globales y las secciones.

### Editores compartidos

4. [`LogoManager.tsx`](../../src/components/admin/LogoManager.tsx#L16) — Galería completa de logos, recorte, tema y principal.
5. [`BannerForm.tsx`](../../src/components/admin/BannerForm.tsx#L29) — Formulario compartido para crear y editar banners.
6. [`HomeGridClient.tsx`](../../src/components/admin/HomeGridClient.tsx#L14) — CRUD y orden de tarjetas de la grilla.

### Contratos y seguridad del servidor

7. [`navigation.actions.ts`](../../src/server/actions/navigation.actions.ts#L24) — Valida antes del servicio y revalida constructor y tienda.
8. [`banner.actions.ts`](../../src/server/actions/banner.actions.ts#L29) — Acciones compartidas con validación en el límite.
9. [`navigation.validator.ts`](../../src/server/validators/navigation.validator.ts#L5) — URLs seguras y posiciones únicas.
10. [`banner.service.ts`](../../src/server/services/banner.service.ts#L40) — Interpreta fechas colombianas y cierres de vigencia.
11. [`safe-url.ts`](../../src/lib/safe-url.ts#L3) — Restringe enlaces públicos a rutas relativas, HTTP o HTTPS.

### Navegación administrativa

12. [`AdminSidebar.tsx`](../../src/components/admin/AdminSidebar.tsx#L102) — Mantiene un único acceso de diseño.
13. [`banners/page.tsx`](../../src/app/admin/banners/page.tsx#L3) — Redirección representativa de las cinco rutas retiradas.
14. [`useAdminHotkeys.ts`](../../src/hooks/useAdminHotkeys.ts#L89) — Dirige el atajo de banners al constructor.

### Previsualización y regresiones

15. [`HeroBanner.tsx`](../../src/components/home/HeroBanner.tsx#L118) — Evita índices inválidos al cambiar la lista de banners.
16. [`TopBannerTicker.tsx`](../../src/components/TopBannerTicker.tsx#L26) — Normaliza mensajes heredados y URLs antes de renderizar.
17. [`safe-url.test.ts`](../../src/lib/__tests__/safe-url.test.ts#L1) — Cubre protocolos peligrosos y enlaces permitidos.
18. [`landing-content.service.test.ts`](../../src/server/services/__tests__/landing-content.service.test.ts#L1) — Verifica reglas compartidas de contenido y posiciones.
