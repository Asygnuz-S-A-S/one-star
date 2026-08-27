---
title: 'Automatizar migraciones al arrancar y retirar enlace muerto del login'
type: 'bugfix'
created: '2026-08-27'
status: 'done'
baseline_commit: '3b3e6b5f71623ca0749eb07bbd56117f628afebd'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/REQUERIMIENTOS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La imagen final puede iniciar `server.js` sin aplicar migraciones y morir si PostgreSQL aún no acepta conexiones; además, el login ofrece una recuperación de contraseña inexistente que termina en 404.

**Approach:** Incorporar un entrypoint que, únicamente en el arranque normal del servidor, espere la conexión con reintentos acotados, ejecute `prisma migrate deploy` y entregue el proceso a Node. Retirar el CTA de recuperación hasta que exista un flujo real, sin inventar una implementación parcial de seguridad.

## Boundaries & Constraints

**Always:** Mantener `prisma migrate deploy` y el modelo expand/contract; usar la conexión directa de migraciones sin exponer credenciales en argumentos; propagar señales mediante `exec`; permitir inspeccionar/usar la imagen con comandos alternos sin forzar conexión a BD; registrar intentos sin secretos; conservar `<Link>` para navegación interna existente.

**Ask First:** Implementar recuperación real de contraseña; cambiar los límites predeterminados de reintento tras validarlos; ejecutar migraciones contra una base externa o productiva; cambiar la topología de PostgreSQL.

**Never:** Ejecutar `migrate dev`, `db push` o seed en el arranque de producción; reintentar indefinidamente; iniciar `server.js` después de una migración fallida; quemar credenciales; dejar un enlace que apunte a una ruta inexistente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| BD lista | Primer sondeo conecta | Ejecuta una vez `migrate deploy` y luego `node server.js` | Falla el contenedor si la migración falla |
| BD demora | Sondeos iniciales fallan y uno posterior conecta | Espera entre intentos, migra e inicia la app | Informa cada reintento sin imprimir URLs |
| BD no conecta | Se agota el máximo de intentos | No migra ni inicia la app | Sale distinto de cero con mensaje claro |
| Comando auxiliar | La imagen recibe un comando distinto del CMD normal | Ejecuta directamente el comando recibido | No exige conexión a BD |
| Login | Usuario abre `/login` | No ve un CTA hacia `/recuperar-contrasena` | La navegación restante conserva rutas válidas |

</frozen-after-approval>

## Code Map

- `Dockerfile` -- empaqueta Prisma y define el arranque normal de la imagen final.
- `docker-entrypoint.sh` -- nuevo coordinador POSIX de espera, migración e inicio de servidor.
- `scripts/docker-entrypoint.test.ts` -- pruebas aisladas con binarios simulados para éxito, reintento, agotamiento y bypass.
- `docker-compose.prod.yml` -- producción debe delegar la migración al entrypoint y esperar salud de PostgreSQL.
- `src/app/login/page.tsx` -- contiene el enlace muerto que debe retirarse.
- `e2e/auth.spec.ts` -- contrato visible del login.
- `.env.example`, `README.md`, `docs/architecture.md` -- configuración y operación del arranque automático.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/docker-entrypoint.test.ts` y `e2e/auth.spec.ts` -- añadir primero reproducciones RED de todos los escenarios relevantes.
- [x] `docker-entrypoint.sh` y `Dockerfile` -- esperar la BD con reintentos acotados, migrar y ejecutar el CMD con propagación de señales.
- [x] `docker-compose.prod.yml` -- retirar el servicio de migración redundante, hacer que `app` dependa de la salud de `db` y conservar la recuperación tras reinicios del host con ciclos internos acotados.
- [x] `src/app/login/page.tsx` -- retirar el CTA no funcional conservando la alineación del formulario.
- [x] `.env.example`, `README.md` y `docs/architecture.md` -- documentar valores predeterminados, overrides y nueva secuencia.

**Acceptance Criteria:**
- Given una imagen con migraciones compatibles, when el contenedor arranca normalmente y la BD termina disponible, then las migraciones se aplican antes de iniciar el servidor.
- Given una BD que no acepta conexiones durante todos los intentos, when termina el último sondeo, then el contenedor falla sin ejecutar migraciones ni la aplicación.
- Given una migración inválida, when `migrate deploy` falla, then `server.js` nunca inicia.
- Given el login renderizado, when se inspeccionan sus enlaces internos, then ninguno apunta a `/recuperar-contrasena`.

## Spec Change Log

- 2026-08-27: La revisión detectó que `on-failure:3` evitaba reinicios ilimitados pero dejaba la tienda detenida después de reiniciar Docker/VPS. Se conservó `unless-stopped` y se aclaró que el límite aplica a cada ejecución del entrypoint; un nuevo ciclo pertenece a la política externa de recuperación. KEEP: timeout por sondeo, límites numéricos, `DIRECT_URL` obligatoria, orden `probe → migrate → server` y ausencia del enlace muerto.

## Design Notes

El sondeo usa `prisma db execute` con `SELECT 1` y variables de entorno, evitando agregar `psql` a la imagen o revelar la URL en la lista de procesos. El entrypoint solo prepara el arranque cuando recibe el CMD exacto de la aplicación; comandos operativos explícitos siguen funcionando como antes. El entrypoint nunca mantiene un bucle interno ilimitado; `unless-stopped` puede lanzar otra ejecución acotada para preservar recuperación tras caídas o reinicios del host.

## Verification

**Commands:**
- `pnpm vitest run scripts/docker-entrypoint.test.ts scripts/docker-compose-prod.test.ts` -- expected: escenarios del shell y política Compose verdes.
- `pnpm exec playwright test e2e/auth.spec.ts --project=chromium --grep "recuperación"` -- expected: login sin enlace muerto.
- `docker compose --env-file <fixture> -f docker-compose.prod.yml config` -- expected: configuración válida sin servicio `migrate`.
- `pnpm lint && pnpm exec tsc --noEmit && pnpm test && pnpm build` -- expected: calidad y regresión completas en verde.
- `docker build --target runner ...` -- expected: imagen final incluye entrypoint ejecutable y Prisma 6.19.3.

**Resultado (2026-08-27):** Las 12 pruebas del entrypoint, las 2 de Compose y el E2E focalizado pasaron; lint terminó con 22 advertencias preexistentes y 0 errores; TypeScript, 66 suites/535 pruebas, build de Next, validación de Compose e imagen `runner` pasaron. La imagen aplicó 14 migraciones ya presentes contra PostgreSQL local, reportó cero pendientes e inició Next. `pnpm test:coverage` ejecutó el baseline anterior de 527 pruebas, pero el umbral histórico global falló con 60.83% de líneas y 48.6% de funciones; el alcance nuevo de shell queda cubierto por sus escenarios aunque no pertenece al `include` V8 de servicios/repositorios.

## Suggested Review Order

**Arranque seguro de la imagen**

- Valida configuración, sondea la conexión, migra y entrega señales al servidor.
  [`docker-entrypoint.sh:6`](../../docker-entrypoint.sh#L6)

- Empaqueta el script y lo establece antes del CMD standalone.
  [`Dockerfile:103`](../../Dockerfile#L103)

- Conserva recuperación tras reboot y elimina el job de migración redundante.
  [`docker-compose.prod.yml:20`](../../docker-compose.prod.yml#L20)

**Corrección del login**

- Retira el CTA sin ruta manteniendo el campo de contraseña accesible.
  [`page.tsx:135`](../../src/app/login/page.tsx#L135)

**Cobertura y operación**

- Recorre éxito, reintentos, límites, URLs, fallos y orden completo.
  [`docker-entrypoint.test.ts:128`](../../scripts/docker-entrypoint.test.ts#L128)

- Fija el contrato de topología y recuperación del Compose productivo.
  [`docker-compose-prod.test.ts:8`](../../scripts/docker-compose-prod.test.ts#L8)

- Protege el login contra la reaparición del enlace muerto.
  [`auth.spec.ts:63`](../../e2e/auth.spec.ts#L63)

- Documenta configuración, diagnóstico y secuencia del despliegue.
  [`README.md:200`](../../README.md#L200)
