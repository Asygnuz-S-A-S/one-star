---
title: 'PR #15 — Endurecer acciones masivas y filtros de productos admin'
type: 'bugfix'
created: '2026-09-01'
status: 'done'
baseline_commit: 'aaef4924b238ddbb172114fbf44587d633fb3dfe'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/docs/stories/story-003.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Las nuevas acciones masivas y los filtros del listado administrativo pueden afectar productos no seleccionados, ocultar errores, mostrar estados engañosos y construir consultas incompletas o sin validación; además, el filtro de agotados mantiene CI en rojo.

**Approach:** Hacer estable la selección por ID, validar y comprobar íntegramente la mutación, mostrar feedback veraz y separar los filtros administrativos por identificadores exactos, conservando los contratos públicos existentes.

## Boundaries & Constraints

**Always:** Mantener el flujo Client Component → Server Action → Service → Repository → Prisma; autenticar con `requireAdmin`; validar entradas con Zod antes del servicio; conservar `server-only` en módulos servidor; aplicar TDD incremental; mantener selección solo ante error y limpiarla tras éxito; representar `isPublished` como estado de publicación; usar IDs exactos para categoría y marca; preservar paginación y query params.

**Ask First:** Cualquier migración o cambio de Prisma, modificación del tamaño de página, cambio del contrato público de marcas/catálogo, o ampliación de la acción masiva más allá de los productos visibles seleccionados.

**Never:** Modificar checkout, pagos, `order.repository.ts`, semántica ERP o fuentes de stock; cambiar `fetchBrands()` público; tocar archivos locales no versionados; publicar comentarios o commits en GitHub.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Acción válida | IDs únicos de filas visibles y booleano | Actualiza exactamente todos los IDs, informa éxito y limpia selección | Si el conteo difiere, no confirma éxito total |
| Payload inválido | Lista vacía, duplicada, excesiva, ID inválido o estado no booleano | No llama al servicio | Devuelve error legible y conserva selección |
| Fallo servidor | Sesión expirada o error de persistencia | Ningún éxito aparente | Muestra error y conserva selección para reintentar |
| Cambio de dataset | Selección activa y luego paginación/filtro | Ninguna fila nueva hereda la selección anterior | Selección se reinicia por cambio de datos |
| Filtros combinados | Categoría/marca/estado/stock válidos | `findMany` y `count` reciben el mismo filtro exacto | Valores inválidos se ignoran de forma segura |
| Marca inactiva | Marca sin productos publicados | Sigue disponible en el filtro admin | No altera la lista pública de marcas |

</frozen-after-approval>

## Code Map

- `src/server/validators/product.validator.ts` -- contrato Zod para filtros y publicación masiva.
- `src/app/admin/productos/actions.ts` -- frontera autenticada de la mutación.
- `src/app/admin/productos/page.tsx` -- parseo de query params y opciones administrativas.
- `src/server/services/product.service.ts` -- composición tipada y exacta de filtros; verificación del conteo actualizado.
- `src/server/repositories/product.repository.ts` -- persistencia masiva ya existente y prueba de su contrato.
- `src/components/admin/DataTable.tsx` -- identidad estable y ciclo de vida de selección.
- `src/components/admin/ProductosTable.tsx` -- estado de publicación, resultado de acción y feedback.
- `src/components/admin/product-table.model.ts` -- lógica UI pura comprobable sin DOM.
- `src/server/services/__tests__/product.service.test.ts` -- matriz de filtros y mutación.
- `src/app/admin/productos/actions.test.ts` -- autorización, validación y propagación de resultados.
- `src/components/admin/product-table.model.test.ts` -- identidad, estado y decisión de limpiar selección.

## Tasks & Acceptance

**Execution:**
- [x] `src/server/services/__tests__/product.service.test.ts` y `src/server/services/product.service.ts` -- probar y corregir filtros exactos/combinables sin `any`, y exigir actualización completa.
- [x] `src/server/validators/product.validator.ts` y `src/app/admin/productos/actions.test.ts` -- definir primero casos inválidos y luego validar la Server Action autorizada.
- [x] `src/app/admin/productos/page.tsx` -- usar esquemas de query y opciones de categoría/marca por ID, reutilizando `getAllBrands`.
- [x] `src/components/admin/product-table.model.test.ts` y `product-table.model.ts` -- fijar por pruebas identidad estable, badge de publicación y política de éxito/error.
- [x] `src/components/admin/DataTable.tsx` y `ProductosTable.tsx` -- integrar selección estable/reiniciable y feedback accesible sin perder selección al fallar.
- [x] `src/server/repositories/__tests__/product.repository.test.ts` -- comprobar IDs y datos entregados a `updateMany`.

**Acceptance Criteria:**
- Given una selección en una página, when cambia el dataset, then ninguna fila distinta queda seleccionada.
- Given un producto despublicado con stock, when se renderiza, then muestra `INACTIVO`, no `ACTIVO` ni `SALE`.
- Given filtros administrativos combinados, when se consulta, then categoría y marca usan IDs exactos y stock/estado no se sobrescriben.
- Given un error de acción, when termina la transición, then aparece feedback de error y la selección permanece.
- Given éxito completo, when termina la transición, then aparece feedback de éxito y la selección se limpia.
- Given la rama del PR, when se ejecutan lint, tests y build, then todos finalizan correctamente.

## Spec Change Log

## Verification

**Commands:**
- `pnpm exec vitest run <test-focal>` -- cada ciclo Red/Green demuestra el comportamiento corregido.
- `CI=true pnpm lint` -- cero errores y cero advertencias introducidas.
- `pnpm test` -- suite completa verde.
- `pnpm build` -- compilación Next.js 16 exitosa.

**Manual checks (if no CLI):**
- En `/admin/productos`, combinar filtros, paginar con selección activa y forzar un error de acción para comprobar mensajes y conservación de selección.

## Review Outcome

- `patch` — IDs de productos, categorías y marcas ahora exigen CUID válido antes del servicio.
- `patch` — La publicación masiva se ejecuta en transacción y revierte si el conteo no coincide.
- `patch` — El feedback usa fallback seguro, evita dobles envíos con un coordinador probado y persiste al quedar la tabla vacía.
- `defer` — Cotas/páginas fuera de rango, cobertura E2E del flujo y gates en checkout limpio quedaron registrados en `deferred-work.md`.
- `defer` — Concurrencia de pagos y fuente canónica de stock permanecen fuera del alcance congelado.
- `reject` — Compatibilidad de `marca` por nombre contradice el contrato admin aprobado por ID; el contrato público no cambió.
- `reject` — Semántica SALE/precio y stock negativo son invariantes preexistentes, no defectos introducidos aquí.

**Verification evidence:** 69 archivos / 552 pruebas verdes; ESLint del código versionado y archivos nuevos sin hallazgos; compilación Next.js exitosa; typecheck aislado del alcance exitoso. El build global sigue bloqueado exclusivamente por `scripts/check-loggro-tenis.ts`, archivo diagnóstico local no versionado que importa `dotenv`.

## Suggested Review Order

**Frontera y atomicidad**

- Valida autenticación y payload antes de mutar o revalidar catálogos.
  [`actions.ts:178`](../../src/app/admin/productos/actions.ts#L178)

- Exige CUIDs válidos y normaliza filtros administrativos no confiables.
  [`product.validator.ts:13`](../../src/server/validators/product.validator.ts#L13)

- Revierte toda la escritura cuando falta cualquiera de los productos seleccionados.
  [`product.repository.ts:501`](../../src/server/repositories/product.repository.ts#L501)

**Filtros exactos**

- Separa IDs administrativos del contrato público por nombre y combina variantes sin sobrescrituras.
  [`product.service.ts:352`](../../src/server/services/product.service.ts#L352)

- Conecta parámetros validados y opciones administrativas, preservando paginación y filtros.
  [`page.tsx:16`](../../src/app/admin/productos/page.tsx#L16)

**Selección y feedback**

- Mantiene identidad estable, bloquea dobles envíos y conserva feedback al vaciar resultados.
  [`ProductosTable.tsx:178`](../../src/components/admin/ProductosTable.tsx#L178)

- Define estado publicado, política de limpieza y mensajes de error comprobables.
  [`product-table.model.ts:11`](../../src/components/admin/product-table.model.ts#L11)

- Permite que cada tabla declare una identidad persistente para sus filas.
  [`DataTable.tsx:24`](../../src/components/admin/DataTable.tsx#L24)

**Pruebas**

- Cubre autorización, límites, CUIDs, errores y revalidación de la acción.
  [`actions.test.ts:22`](../../src/app/admin/productos/actions.test.ts#L22)

- Demuestra composición exacta de filtros y rechazo del conteo parcial.
  [`product.service.test.ts:183`](../../src/server/services/__tests__/product.service.test.ts#L183)

- Verifica transacción y rollback ante una selección incompleta.
  [`product.repository.test.ts:87`](../../src/server/repositories/__tests__/product.repository.test.ts#L87)
