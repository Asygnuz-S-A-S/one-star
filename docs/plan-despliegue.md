# Plan de despliegue — One Star

> Ruta de dos etapas: primero un ambiente público gratuito para que el cliente
> valide la tienda, después producción real en un servidor propio.
>
> Documentos relacionados: `docs/deploy-vercel.md` (procedimiento detallado de la
> etapa 1), `docs/architecture.md` (sección Despliegue).

---

## Principio que guía el plan: cero vendor lock-in

Cada decisión de este plan se tomó de modo que la etapa 2 no requiera reescribir
nada. Lo que hace portable al proyecto:

| Pieza | Por qué no ata a un proveedor |
|---|---|
| Postgres | Supabase es PostgreSQL estándar. Mismo `schema.prisma`, mismas migraciones, misma tabla `_prisma_migrations`. Mover la base es un `pg_dump` + `psql`. De Supabase se usa **solo la base de datos**: no Auth (es better-auth), no Storage (es Cloudinary), no el SDK `@supabase/*`. |
| `directUrl` en Prisma | Campo estándar de Prisma, no de ningún hosting. Con tu propio Postgres apunta al mismo sitio que `DATABASE_URL`. |
| `vercel.json` | Lo ignora cualquier otra plataforma. En un VPS es un archivo inerte. |
| Cron | `node-cron` se reactiva solo cuando `process.env.VERCEL` no existe. Recuperas los 30 min sin tocar código. |
| Imágenes | Cloudinary por HTTP — funciona igual desde donde sea. Deliberadamente **no** se usa Vercel Blob. |
| Correos y pagos | Resend y ePayco son APIs HTTP, indiferentes al hosting. |
| Build | `output: "standalone"` en `next.config.ts` es justo lo que necesita el self-hosting. El `Dockerfile` ya está listo. |

**Verificado en el código:** cero paquetes `@vercel/*`, cero rutas en Edge
Runtime, cero SDK de Supabase. Todo el acceso a datos pasa por Prisma.

**Regla para mantenerlo así:** no adoptar Vercel Blob, Vercel KV/Postgres, ni
`@supabase/supabase-js`, Supabase Auth, Storage, Realtime o Row Level Security.
Esa es la tentación real ahora que la base está en Supabase: en el momento en
que la autenticación o las imágenes dependan de Supabase, la etapa 3 deja de ser
un `pg_dump` y se vuelve una reescritura.

---

## Etapa 0 — Ordenar el repositorio

**Objetivo:** que lo que se despliegue sea lo que está en `develop`.

> **Estado del repo (2026-07-29):** `origin/main` solo tiene
> `Initial commit from Create Next App`. Todo el código real vive en `develop`.
> Por eso la rama de producción es `develop`, no `main`.

| # | Tarea | Detalle |
|---|---|---|
| 0.1 | Sacar `.claude/settings.local.json` del commit | Es config de máquina local. `.gitignore` ya tenía `.claude/`, pero el archivo seguía rastreado: hay que `git rm --cached`. Las skills de BMAD bajo `.claude/skills/` **sí** se quedan versionadas |
| 0.2 | Commitear los 36 archivos pendientes | Incluye la migración `20260727221500_add_product_color` |
| 0.3 | Push de `feat/fotos-por-color-y-tema-oscuro` | La rama nunca se ha subido al remoto |
| 0.4 | Merge a `develop` y push | `develop` pasa a ser la rama de producción |
| 0.5 | Correr `pnpm test` y `pnpm build` en local | Que el build pase antes de que lo intente Vercel |

**Riesgo si se omite 0.2:** Vercel construye desde GitHub. Sin esa migración
subida, el código nuevo espera columnas que no existirán en la base.

## Etapa 1 — Ambiente de pruebas en Vercel (gratis)

**Objetivo:** URL pública para que el cliente pruebe. Sin tarjeta, sin costo.

| # | Tarea | Detalle |
|---|---|---|
| 1.1 | Crear proyecto en Supabase | Región `East US (North Virginia)`, plan Free. Guardar la contraseña de la base |
| 1.2 | Copiar las dos cadenas del pooler | `DATABASE_URL` puerto 6543 con `pgbouncer=true`; `DIRECT_URL` puerto 5432. La conexión directa `db.<ref>.supabase.co` es IPv6 y Vercel no la alcanza |
| 1.3 | `prisma migrate deploy` + `db:seed` + `scripts/create-admin.ts` desde local | Vercel no corre migraciones. El seed **no** crea el admin: es un paso aparte |
| 1.4 | Crear proyecto en Vercel desde GitHub | **Production Branch = `develop`** |
| 1.5 | Cargar las ~20 variables de entorno | Lista en `.env.example` |
| 1.6 | Primer deploy | 3-6 min |
| 1.7 | Corregir `NEXT_PUBLIC_APP_URL` y `BETTER_AUTH_URL` con el dominio real y redesplegar | **El paso que más se olvida** — sin él el login falla en silencio |
| 1.8 | Apuntar el webhook de ePayco al dominio nuevo | Sin esto los pedidos quedan pendientes para siempre |
| 1.9 | Checklist de verificación funcional | Ver paso 7 de `docs/deploy-vercel.md` |

**Restricciones aceptadas en esta etapa:** cron 1×/día en vez de cada 30 min,
`NEXT_PUBLIC_EPAYCO_TEST=true`, y el plan Hobby prohíbe uso comercial.

**La pausa de Supabase Free.** El plan gratuito pausa el proyecto tras 7 días sin
actividad y hay que reactivarlo a mano. Acá queda cubierto de rebote: el cron
diario escribe en `ErpSyncLog` en cada ejecución — incluso con
`ERP_PROVIDER=null` — así que hay actividad diaria en la base. La dependencia es
real, no decorativa: si se quita el bloque `crons` de `vercel.json` o el endpoint
empieza a responder 503 por falta de `CRON_SECRET`, vuelve el riesgo de pausa.

## Etapa 2 — Validación con el cliente

**Objetivo:** recoger feedback sin tocar lo que el cliente está probando.

| # | Tarea | Detalle |
|---|---|---|
| 2.1 | Entregar el enlace con los dos avisos | Pagos en modo prueba; primera carga tarda ~1s |
| 2.2 | Trabajar los ajustes en ramas | Cada rama genera su propia URL de preview |
| 2.3 | Mergear a `develop` solo lo aprobado | Push a `develop` = actualización del sitio |
| 2.4 | Aplicar migraciones nuevas a mano tras cada push que las traiga | `pnpm prisma migrate deploy` contra `DIRECT_URL` |

**Cuidado con los previews:** apuntan a la misma base que producción. Una
migración destructiva en una rama de preview le borra los datos al cliente.

## Etapa 3 — Producción en servidor propio

**Objetivo:** tienda vendiendo de verdad, con base de datos propia y sin las
restricciones del plan Hobby.

**Disparadores para pasar a esta etapa:** el cliente aprueba, o se necesita la
sync del ERP cada 30 min, o se va a cobrar dinero real (el plan Hobby de Vercel
no lo permite).

| # | Tarea | Detalle |
|---|---|---|
| 3.1 | Contratar el servidor | Hetzner CX22 (~$5) o Lightsail 2 GB ($12, 3 meses gratis) |
| 3.2 | Instalar Docker + swap de 4 GB | El swap evita que `next build` muera por OOM con 2 GB de RAM |
| 3.3 | Compose de producción: app + Postgres + migraciones | Usar `docker-compose.prod.yml`: sin Adminer ni puertos publicados; el proxy HTTPS del servidor se conecta a `onestar_frontend` |
| 3.4 | Dominio real apuntando al servidor | Reemplaza el `*.vercel.app` |
| 3.5 | Migrar los datos desde Supabase | Procedimiento abajo |
| 3.6 | `NEXT_PUBLIC_EPAYCO_TEST=false` y llaves de producción de ePayco | Cobros reales |
| 3.7 | Dominio verificado en Resend | `onboarding@resend.dev` solo entrega al dueño de la cuenta |
| 3.8 | Backups automáticos | `pg_dump` diario + snapshots del servidor |
| 3.9 | Verificar que `node-cron` volvió a los 30 min | Sin `VERCEL` definida se reactiva solo |

### Cómo se migra la base de datos (3.5)

No hay conversión ni conflicto: es el mismo PostgreSQL en los dos lados.

```bash
# 1. Exportar desde Supabase (usa DIRECT_URL — el pooler en modo session,
#    puerto 5432 — no el de modo transaction del 6543)
pg_dump "$DIRECT_URL_SUPABASE" --no-owner --no-privileges -Fc -f onestar.dump

# 2. Restaurar en el Postgres del servidor
pg_restore -d "$DATABASE_URL_SERVIDOR" --no-owner --no-privileges onestar.dump

# 3. Confirmar que el historial de migraciones viajó completo
psql "$DATABASE_URL_SERVIDOR" -c "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

# 4. Prisma no debería encontrar nada pendiente
pnpm prisma migrate status
```

El paso 3 es el que confirma que no habrá conflicto: la tabla
`_prisma_migrations` viaja dentro del dump, así que el servidor nuevo sabe
exactamente qué migraciones ya se aplicaron y Prisma no intenta repetirlas.

**Ventana de inconsistencia:** entre el `pg_dump` y el cambio de DNS, los pedidos
que entren en Supabase no estarán en el servidor nuevo. Para un catálogo de prueba da
igual; si ya hay pedidos reales, hay que poner la tienda en mantenimiento durante
la migración.

---

## Costos por etapa

| Etapa | Costo | Tarjeta |
|---|---|---|
| 1 y 2 — Vercel Hobby + Supabase Free | $0 | No |
| 3 — Hetzner CX22 | ~$5/mes | Sí |
| 3 (alternativa) — Lightsail 2 GB | $12/mes, 3 gratis | Sí |
| 3 (alternativa sin administrar) — Vercel Pro + Supabase Pro | ~$45/mes | Sí |

## Qué queda fuera de este plan

Cosas que la tienda necesita antes de vender en serio y que no dependen del
hosting:

- CSP — pendiente a propósito según `next.config.ts`; requiere inventariar los
  scripts de ePayco y Sentry.
- Cobertura de tests ≥ 80 % en servicios y repositorios (regla 6 del proyecto).
- `GA4_MEASUREMENT_ID` y `META_PIXEL_ID`, listados como pendientes en
  `docs/architecture.md`.
- Política de retención de datos personales de clientes.
