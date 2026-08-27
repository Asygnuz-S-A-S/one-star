---
title: 'Automatizar migraciones al arrancar y retirar enlace muerto del login'
type: 'bugfix'
created: '2026-08-27'
status: 'in-progress'
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
- [ ] `scripts/docker-entrypoint.test.ts` y `e2e/auth.spec.ts` -- añadir primero reproducciones RED de todos los escenarios relevantes.
- [ ] `docker-entrypoint.sh` y `Dockerfile` -- esperar la BD con reintentos acotados, migrar y ejecutar el CMD con propagación de señales.
- [ ] `docker-compose.prod.yml` -- retirar el servicio de migración redundante y hacer que `app` dependa de la salud de `db`.
- [ ] `src/app/login/page.tsx` -- retirar el CTA no funcional conservando la alineación del formulario.
- [ ] `.env.example`, `README.md` y `docs/architecture.md` -- documentar valores predeterminados, overrides y nueva secuencia.

**Acceptance Criteria:**
- Given una imagen con migraciones compatibles, when el contenedor arranca normalmente y la BD termina disponible, then las migraciones se aplican antes de iniciar el servidor.
- Given una BD que no acepta conexiones durante todos los intentos, when termina el último sondeo, then el contenedor falla sin ejecutar migraciones ni la aplicación.
- Given una migración inválida, when `migrate deploy` falla, then `server.js` nunca inicia.
- Given el login renderizado, when se inspeccionan sus enlaces internos, then ninguno apunta a `/recuperar-contrasena`.

## Spec Change Log

## Design Notes

El sondeo usa `prisma db execute` con `SELECT 1` y variables de entorno, evitando agregar `psql` a la imagen o revelar la URL en la lista de procesos. El entrypoint solo prepara el arranque cuando recibe el CMD exacto de la aplicación; comandos operativos explícitos siguen funcionando como antes.

## Verification

**Commands:**
- `pnpm vitest run scripts/docker-entrypoint.test.ts` -- expected: escenarios del shell verdes.
- `pnpm exec playwright test e2e/auth.spec.ts --project=chromium --grep "recuperación"` -- expected: login sin enlace muerto.
- `docker compose --env-file <fixture> -f docker-compose.prod.yml config` -- expected: configuración válida sin servicio `migrate`.
- `pnpm lint && pnpm exec tsc --noEmit && pnpm test && pnpm build` -- expected: calidad y regresión completas en verde.
- `docker build --target runner ...` -- expected: imagen final incluye entrypoint ejecutable y Prisma 6.19.3.
