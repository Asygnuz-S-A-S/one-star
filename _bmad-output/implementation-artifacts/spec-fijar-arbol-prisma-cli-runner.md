---
title: 'Fijar el árbol del CLI de Prisma en el runner'
type: 'chore'
created: '2026-08-25'
status: 'done'
baseline_commit: '4a3a60203ac6949fc2cee07f7bd3909a105227a3'
context:
  - '{project-root}/docs/architecture.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El runner instala `prisma@6.19.3` con `npm install --no-package-lock`; aunque la dependencia directa está fijada, sus transitivas se resuelven de nuevo en cada build. Dos builds del mismo commit pueden ejecutar árboles distintos contra la base de producción.

**Approach:** Versionar un manifest y un `package-lock.json` exclusivos para el CLI, copiarlos al prefijo aislado `/opt/prisma-cli` y reemplazar la instalación ad hoc por `npm ci --omit=dev`, sin cambiar el comando operativo de migración.

## Boundaries & Constraints

**Always:** Declarar `prisma` exactamente en `6.19.3`; generar un lockfile npm v3 con la misma familia de npm usada por `node:20-alpine`; conservar `/opt/prisma-cli`, `NODE_PATH`, el symlink de compatibilidad, la comprobación CLI/Client, los lifecycle scripts de Prisma y el usuario final `nextjs`; mantener `node node_modules/prisma/build/index.js migrate deploy`.

**Ask First:** Cambiar Prisma, Node, Alpine, la arquitectura/plataforma del build, el comando de migración o fijar la imagen base por digest.

**Never:** Enumerar transitivas manualmente; usar `npm install`, `--no-package-lock` o rangos semver para este árbol; mezclarlo con `node_modules` standalone; modificar schema, migraciones, Compose, TLS, protecciones GitHub, credenciales admin o ePayco; ejecutar contra producción.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Build limpio | Manifest y lock sincronizados | `npm ci` instala exactamente el árbol bloqueado en `/opt/prisma-cli` | Integridad o descarga inválida hace fallar el build |
| Drift manifest/lock | Prisma cambia solo en uno de los archivos | `npm ci` rechaza la instalación | CI queda rojo antes de migrar |
| CLI/Client desalineados | Versiones Prisma distintas | La comprobación existente falla | La imagen runner no se publica |
| Ejecución normal | Runner y PostgreSQL vacío | Se aplican todas las migraciones con el entrypoint existente | El proceso propaga un exit code no cero |

</frozen-after-approval>

## Code Map

- `Dockerfile` -- construye el runner e instala el CLI aislado.
- `docker/prisma-cli/package.json` -- contrato mínimo y exacto del CLI.
- `docker/prisma-cli/package-lock.json` -- resolución completa e integridades del árbol npm.
- `.github/workflows/ci.yml` -- construye el runner, migra PostgreSQL real y prueba la aplicación.
- `docs/architecture.md` -- documenta la reproducibilidad y su límite.

## Tasks & Acceptance

**Execution:**
- [x] `docker/prisma-cli/package.json` y `package-lock.json` -- crear el paquete privado con `prisma: 6.19.3` y generar el lock usando npm 10.8.2 dentro de `node:20-alpine`.
- [x] `Dockerfile` -- copiar ambos archivos y ejecutar `npm ci --prefix /opt/prisma-cli --omit=dev`; conservar limpieza de caché, symlink y guard de versiones.
- [x] `.github/workflows/ci.yml` -- corregir el comentario para describir el árbol bloqueado; mantener intacta la prueba real.
- [x] `docs/architecture.md` -- registrar cómo actualizar el lock y aclarar que esto fija dependencias npm, no la imagen completa.

**Acceptance Criteria:**
- Given dos builds del mismo commit y plataforma con caché vacía, when npm instala el CLI, then usa las mismas versiones e integridades declaradas en el lock.
- Given un manifest que no coincide con el lock, when se construye el runner, then `npm ci` falla antes de ejecutar migraciones.
- Given el runner terminado, when se consulta Prisma, then CLI y Client reportan `6.19.3` y existen engines musl.
- Given PostgreSQL vacío, when CI ejecuta `migrate deploy`, then aplica las 14 migraciones y el smoke de `/api/health` pasa como usuario no root.

## Spec Change Log

## Design Notes

El lock fija versiones, tarballs e integridades del árbol JavaScript, pero no promete imágenes byte-idénticas: `node:20-alpine`, repositorios APK y binarios por arquitectura siguen siendo variables. Fijar digest/plataforma es un endurecimiento separado que requiere aprobación.

## Verification

**Commands:**
- `npm ci --prefix docker/prisma-cli --omit=dev` -- expected: instalación sin modificar el lock.
- `docker build --no-cache --target runner …` -- expected: runner construido con `npm ci`.
- `docker run --rm <imagen> node node_modules/prisma/build/index.js --version` -- expected: CLI/Client `6.19.3` y engines musl.
- `docker-migrate-check` -- expected: 14 migraciones y health check verdes contra PostgreSQL 16.
- `pnpm lint && pnpm test && git diff --check` -- expected: sin regresiones.

## Suggested Review Order

**Instalación reproducible**

- Reemplaza resolución dinámica por instalación estricta desde el lock aislado.
  [`Dockerfile:115`](../../Dockerfile#L115)

- Declara Prisma con versión exacta y sin dependencias manuales.
  [`package.json:1`](../../docker/prisma-cli/package.json#L1)

- Fija versiones, tarballs e integridades de todo el árbol npm.
  [`package-lock.json:4`](../../docker/prisma-cli/package-lock.json#L4)

**Guardas operativas**

- Conserva symlink, paridad CLI/Client, limpieza de caché y usuario no root.
  [`Dockerfile:117`](../../Dockerfile#L117)

- Mantiene build, migración PostgreSQL real y smoke del runner.
  [`ci.yml:100`](../../.github/workflows/ci.yml#L100)

**Límites y seguimiento**

- Documenta actualización del lock y variables todavía fuera de su alcance.
  [`architecture.md:373`](../../docs/architecture.md#L373)

- Registra la advisory transitiva y los siguientes pendientes de despliegue.
  [`deferred-work.md:65`](deferred-work.md#L65)
