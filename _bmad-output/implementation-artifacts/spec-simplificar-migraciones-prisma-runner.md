---
title: 'Endurecer Prisma runner y CI de despliegue'
type: 'refactor'
created: '2026-08-24'
status: 'done'
baseline_commit: '51a20899752fc04c0e1243b79eaa91ad0ef1efe9'
context:
  - '{project-root}/docs/architecture.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El `runner` ejecuta migraciones, pero el `Dockerfile` enumera manualmente unas 27 dependencias del CLI de Prisma y esa lista puede quedar obsoleta al actualizarlo. Además, `develop` no exige `docker-migrate-check`, exime a administradores y el workflow no ejecuta lint.

**Approach:** Instalar la versión fijada de Prisma dentro del `runner` para que npm resuelva su árbol, conservar la prueba contra PostgreSQL real, agregar lint al CI y exigir los dos jobs de CI también a administradores mediante la protección de `develop`.

## Boundaries & Constraints

**Always:** Mantener el `runner` capaz de ejecutar `prisma migrate deploy`; conservar el runtime standalone y el usuario sin privilegios; instalar exactamente Prisma 6.19.3; preservar los cambios locales ajenos; aplicar la protección a `develop` solo después de comprobar los nombres exactos de los jobs.

**Ask First:** Cambiar versiones de Prisma, Node o pnpm; exigir revisiones humanas de PR; cambiar el comando de arranque; modificar la topología del despliegue.

**Never:** Modificar o eliminar `docker-compose.prod.yml`; ejecutar migraciones en el `CMD`; copiar todas las dependencias de desarrollo; incluir credenciales; usar `prisma migrate dev` en producción; mezclar el cambio del login administrativo en este PR.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Build del runner | Registro npm disponible | npm instala Prisma 6.19.3 y resuelve todas sus dependencias | El build falla si la instalación o sus scripts fallan |
| Migración pendiente | URLs válidas y PostgreSQL vacío | El CLI del runner aplica todas las migraciones versionadas | Prisma termina con código distinto de cero si falla |
| Calidad del PR | Código con errores de lint, tests, build o migración | GitHub bloquea el merge para cualquier usuario, incluidos administradores | El autor corrige el check fallido; no hay bypass administrativo |

</frozen-after-approval>

## Code Map

- `Dockerfile` -- construye el bundle standalone e instala las herramientas disponibles en la imagen final.
- `.github/workflows/ci.yml` -- ejecuta lint, tests, build y una migración real desde el runner.
- `eslint.config.mjs` -- excluye únicamente artefactos generados y worktrees desechables para que lint evalúe el código fuente real.
- `package.json` -- fija pnpm y declara Prisma 6.19.3 como versión del proyecto.
- `prisma/` -- contiene schema y migraciones que deben viajar en la imagen.
- `docker-compose.prod.yml` -- fuera de alcance; debe permanecer sin cambios.
- Protección GitHub de `develop` -- debe exigir `test-and-build` y `docker-migrate-check` con `enforce_admins=true`.

## Tasks & Acceptance

**Execution:**
- [x] `Dockerfile` -- reemplazar la lista manual de paquetes por una instalación local y fijada de `prisma@6.19.3`, conservando `prisma/`, Prisma Client y sus engines de runtime.
- [x] `.github/workflows/ci.yml` -- agregar `pnpm lint` al job principal y actualizar el comentario de `docker-migrate-check` para reflejar la instalación automática.
- [x] `eslint.config.mjs` y archivos con deuda de lint -- excluir solo salidas generadas y corregir los 21 errores reales sin `continue-on-error` ni desactivar reglas globalmente.
- [x] `Dockerfile` y `.github/workflows/ci.yml` -- construir el runner, comprobar CLI/engines y aplicar las 14 migraciones contra PostgreSQL temporal.
- [x] `.github/workflows/ci.yml` -- arrancar el servidor standalone y comprobar `/api/health` con Prisma Client real.
- [x] `docs/architecture.md` -- documentar la migración previa mediante la imagen final sin alterar el compose existente.

**Acceptance Criteria:**
- Given la imagen final y una base vacía, when corre el entrypoint directo de Prisma con URLs por entorno, then todas las migraciones se aplican correctamente.
- Given un bump futuro del CLI, when se actualiza la versión fijada, then npm resuelve el árbol sin editar una lista de paquetes `COPY`.
- Given un PR a `develop`, when falla `test-and-build` o `docker-migrate-check`, then GitHub impide el merge incluso a administradores.
- Given el diff final, when se inspecciona `docker-compose.prod.yml`, then no contiene cambios.

## Spec Change Log

- 2026-08-24: Andrés confirmó que `effect`, `jiti`, `giget` y `fast-check` son dependencias reales del CLI y pidió instalación automática; se descartó la hipótesis de eliminarlas omitiendo `prisma.config.ts`. Se incorporaron lint y protección bloqueante como partes del mismo objetivo de seguridad de despliegue.

## Design Notes

La instalación ocurre antes de cambiar a `USER nextjs`; los paquetes quedan de solo lectura para el usuario de runtime. Se mantiene el entrypoint directo `node node_modules/prisma/build/index.js` porque el symlink generado por pnpm entre stages no es confiable. La versión se fija sin rango para no introducir una actualización mayor accidental.

La protección remota se aplica después de revisar y publicar el PR: GitHub debe exigir `test-and-build` y `docker-migrate-check` con `enforce_admins=true`. No se activa revisión humana obligatoria porque Andrés no la solicitó.

## Verification

**Resultados locales (2026-08-24):**

- `pnpm lint` -- aprobado con 0 errores; permanecen 22 advertencias preexistentes.
- `pnpm test` -- aprobadas 57/57 suites y 434/434 pruebas.
- `pnpm exec tsc --noEmit` -- aprobado.
- `docker build --target runner --build-arg AUTH_SECRET=ci-only-dummy-auth-secret-at-least-32-characters --build-arg NEXT_PUBLIC_APP_URL=http://localhost:3000 --build-arg NEXT_PUBLIC_EPAYCO_PUBLIC_KEY=ci-only-dummy-public-key --build-arg NEXT_PUBLIC_EPAYCO_TEST=true --build-arg NEXT_PUBLIC_SENTRY_DSN= -t onestar-runner-ci .` -- aprobado.
- `docker run --rm onestar-runner-ci node node_modules/prisma/build/index.js --version` -- CLI y Client 6.19.3 con engines musl disponibles.
- `docker run --rm --network onestar-review-net -e DATABASE_URL=postgresql://postgres:postgres@onestar-review-db:5432/onestar_migrate_check?schema=public -e DIRECT_URL=postgresql://postgres:postgres@onestar-review-db:5432/onestar_migrate_check?schema=public onestar-runner-ci node node_modules/prisma/build/index.js migrate deploy` -- aplicadas 14/14 migraciones en PostgreSQL 16 vacío.
- Contenedor `onestar-runner-ci` arrancado como `nextjs` (UID 1001); `GET /api/health` devolvió `status=ok` y `db=connected`.
- `git diff --exit-code 51a20899752fc04c0e1243b79eaa91ad0ef1efe9 -- docker-compose.prod.yml` -- aprobado, sin cambios.
- `git diff --check` y parseo YAML de `.github/workflows/ci.yml` -- aprobados.

**Gate remoto aplicado después de publicar el PR #8:** `develop` exige `test-and-build` y `docker-migrate-check`, mantiene `strict=true` y aplica la protección a administradores con `enforce_admins=true`. El resultado se verificó mediante `gh api repos/Asygnuz-S-A-S/one-star/branches/develop/protection`.

## Suggested Review Order

**Runner y seguridad de despliegue**

- El runner aísla Prisma 6.19.3 y conserva el comando operativo existente.
  [`Dockerfile:103`](../../Dockerfile#L103)

- CI bloquea por lint, migración real y arranque saludable del runtime.
  [`ci.yml:60`](../../.github/workflows/ci.yml#L60)

- La arquitectura documenta ambos mecanismos de migración sin cambiar Compose.
  [`architecture.md:373`](../../docs/architecture.md#L373)

**Baseline de lint bloqueante**

- ESLint ignora únicamente artefactos generados y worktrees desechables.
  [`eslint.config.mjs:9`](../../eslint.config.mjs#L9)

- El fixture evita sombrear el callback de Playwright.
  [`fixtures.ts:6`](../../e2e/fixtures.ts#L6)

- El detalle de pedidos reemplaza `any` por el DTO del servicio.
  [`page.tsx:4`](../../src/app/admin/pedidos/%5Bid%5D/page.tsx#L4)

- La página de producto entrega cross-sells ya tipados.
  [`productos/page.tsx:198`](../../src/app/productos/%5Bslug%5D/page.tsx#L198)

- El cropper adopta el tipo `Area` de su biblioteca.
  [`ImageCropperModal.tsx:4`](../../src/components/admin/ImageCropperModal.tsx#L4)

- Los gráficos detectan hidratación sin mutar estado desde un efecto.
  [`OrdersChart.tsx:29`](../../src/components/admin/charts/OrdersChart.tsx#L29)

- El mismo patrón protege el gráfico de ingresos.
  [`RevenueChart.tsx:24`](../../src/components/admin/charts/RevenueChart.tsx#L24)

- El mismo patrón protege el gráfico de productos principales.
  [`TopProductsChart.tsx:23`](../../src/components/admin/charts/TopProductsChart.tsx#L23)

- La franja de marcas valida configuración desconocida antes de usarla.
  [`BrandStrip.tsx:15`](../../src/components/home/BrandStrip.tsx#L15)

- El carrusel filtra slugs y restringe tema y layout.
  [`ProductCarousel.tsx:5`](../../src/components/home/ProductCarousel.tsx#L5)

- El mapa declara explícitamente su contrato de propiedades.
  [`DynamicStoreMap.tsx:7`](../../src/components/tiendas/DynamicStoreMap.tsx#L7)

- Checkout conserva su snapshot único con una supresión local justificada.
  [`success/page.tsx:39`](../../src/app/checkout/success/page.tsx#L39)

- Cuenta usa navegación Next y conserva el reintento de pedidos.
  [`cuenta/page.tsx:6`](../../src/app/cuenta/page.tsx#L6)

- El carrito conserva hidratación inmediata con una supresión local justificada.
  [`CartContext.tsx:43`](../../src/context/CartContext.tsx#L43)

**Scripts auxiliares**

- Los diagnósticos de base liberan Prisma y propagan fallos al proceso.
  [`check_db.js:1`](../../check_db.js#L1)

- La prueba de banner comparte el mismo manejo explícito de errores.
  [`test-banner.js:29`](../../test-banner.js#L29)

- La actualización manual también termina con código distinto de cero.
  [`test_update.js:18`](../../test_update.js#L18)
