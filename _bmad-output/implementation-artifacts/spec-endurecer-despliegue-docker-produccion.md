---
title: 'Endurecer el despliegue Docker de producción'
type: 'chore'
created: '2026-08-13'
status: 'done'
baseline_commit: 'ed0e38b216ade77e65c9d20d2aa4a668b96d1135'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/docs/plan-despliegue.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El build Docker no recibe las variables públicas de ePayco y Sentry, instala una versión variable de pnpm y carece de una composición de producción que aplique migraciones automáticamente sin exponer la base de datos ni incluir credenciales.

**Approach:** Fijar pnpm 10.34.5 en el proyecto y la imagen, declarar y propagar las variables `NEXT_PUBLIC_*` durante el build, y agregar un `docker-compose.prod.yml` que ejecute `prisma migrate deploy` antes de iniciar la aplicación.

## Boundaries & Constraints

**Always:** Trabajar desde una rama basada en `develop`; mantener la imagen `runner` mínima y sin Prisma CLI; cargar credenciales desde variables del host; mantener PostgreSQL y la aplicación sin puertos publicados; hacer que `app` dependa del éxito de `migrate`; conservar las variables públicas tanto en build como en runtime cuando también sean leídas por código servidor.

**Ask First:** Cambiar la topología de base de datos, publicar puertos directamente o agregar un proxy concreto al Compose; cambiar la versión de pnpm solicitada; ejecutar migraciones contra una base real.

**Never:** Incluir secretos o valores reales en Git; ejecutar `prisma migrate dev` o el seed automáticamente en producción; copiar todas las dependencias de desarrollo al `runner`; borrar o mezclar el trabajo de `codex/erp-containment`; desplegar al servidor desde esta tarea.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Build completo | Variables públicas y de autenticación definidas | Next.js incorpora ePayco y Sentry al bundle y usa pnpm 10.34.5 | El build falla si falta una variable marcada como obligatoria por Compose |
| Migración exitosa | PostgreSQL saludable y migraciones pendientes | `migrate` aplica `prisma migrate deploy`; luego inicia `app` | Compose no inicia `app` antes del éxito de `migrate` |
| Migración fallida | Error de conexión o SQL | `migrate` termina con error y `app` no arranca | El operador corrige el entorno o la migración y vuelve a ejecutar el despliegue |
| Entorno incompleto | Falta una credencial requerida | Compose rechaza la configuración o el arranque | Mensaje de variable requerida; nunca usa una credencial quemada |

</frozen-after-approval>

## Code Map

- `Dockerfile` -- instala dependencias y construye el bundle standalone de Next.js.
- `package.json` -- contrato de versión del gestor de paquetes.
- `docker-compose.yml` -- referencia del flujo local con `builder`, `migrate` y `runner`.
- `docker-compose.prod.yml` -- nueva topología de producción sin Adminer ni puertos publicados.
- `README.md` -- requisitos y procedimiento operativo para Docker.
- `docs/plan-despliegue.md` -- fuente de verdad sobre `develop` y el servidor propio.

## Tasks & Acceptance

**Execution:**
- [x] `Dockerfile` -- instalar `pnpm@10.34.5` y declarar/inyectar `NEXT_PUBLIC_EPAYCO_PUBLIC_KEY`, `NEXT_PUBLIC_EPAYCO_TEST` y `NEXT_PUBLIC_SENTRY_DSN` en el stage `builder`.
- [x] `package.json` y `README.md` -- fijar y documentar pnpm 10.34.5 de manera consistente.
- [x] `docker-compose.yml` -- propagar los argumentos públicos de build también en el flujo Docker local.
- [x] `docker-compose.prod.yml` -- definir `db`, `migrate` y `app`, redes internas accesibles por proxy, volumen persistente y variables externas sin valores sensibles.
- [x] `README.md` y `docs/plan-despliegue.md` -- documentar el comando de producción, la rama oficial `develop`, el manejo de migraciones y la ausencia deliberada de puertos publicados.

**Acceptance Criteria:**
- Given un `.env.production` completo, when se valida el Compose, then no contiene Adminer, no publica `ports`, no contiene contraseñas literales y `app` depende de `migrate: service_completed_successfully`.
- Given una construcción Docker, when corre el stage `deps`, then instala exactamente pnpm 10.34.5.
- Given las tres variables públicas, when corre `next build`, then están disponibles como `ARG`/`ENV` en `builder` y llegan desde ambos archivos Compose.
- Given una migración nueva versionada, when se despliega el Compose de producción, then Prisma la aplica antes de iniciar la aplicación.

## Spec Change Log

## Design Notes

La falta de puertos publicados supone que el reverse proxy del servidor se conecta a la red Docker `onestar_frontend`. La base solo pertenece a `onestar_backend`. El `runner` conserva exclusivamente el servidor standalone y los engines de Prisma; el servicio efímero `migrate` reutiliza `builder`, donde ya existen el CLI y `prisma/migrations`.

## Verification

**Commands:**
- `pnpm install --frozen-lockfile` ejecutado con pnpm 10.34.5 -- expected: lockfile compatible sin cambios.
- `docker compose --env-file <archivo-temporal> -f docker-compose.prod.yml config` -- expected: configuración válida sin `ports` ni Adminer.
- `pnpm lint` -- expected: sin errores nuevos.
- `pnpm test` -- expected: suite verde.
- `pnpm build` -- expected: build de producción exitoso.
- `docker build --target builder` con argumentos de prueba -- expected: imagen construida con pnpm fijado y bundle generado.

## Suggested Review Order

**Flujo de despliegue**

- Define la topología segura y bloquea la aplicación hasta migrar.
  [`docker-compose.prod.yml:1`](../../docker-compose.prod.yml#L1)

- Explica el procedimiento operativo y la conexión del proxy externo.
  [`README.md:200`](../../README.md#L200)

**Build reproducible**

- Fija pnpm e inyecta las variables públicas durante `next build`.
  [`Dockerfile:17`](../../Dockerfile#L17)

- Declara la versión oficial para herramientas locales y CI.
  [`package.json:5`](../../package.json#L5)

- Mantiene ePayco y Sentry disponibles en el Compose local.
  [`docker-compose.yml:28`](../../docker-compose.yml#L28)

**Configuración y arquitectura**

- Inventaría las nuevas variables del contenedor PostgreSQL.
  [`.env.example:5`](../../.env.example#L5)

- Documenta aislamiento, migraciones y variables de tiempo de build.
  [`architecture.md:329`](../../docs/architecture.md#L329)

- Alinea la etapa de servidor propio con el nuevo Compose.
  [`plan-despliegue.md:109`](../../docs/plan-despliegue.md#L109)
