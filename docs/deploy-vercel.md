# Despliegue en Vercel + Supabase (ambiente de pruebas para el cliente)

> **Propósito:** dejar la tienda pública en internet para que el cliente la
> pruebe. Costo $0, sin tarjeta de crédito.
>
> **No es apto para vender de verdad.** Ver
> [Límites del plan gratuito](#límites-del-plan-gratuito) y
> [Cuando toque migrar](#cuando-toque-migrar).
>
> **Rama de producción: `develop`.** Cada push a `develop` redespliega el sitio.

---

## Antes de empezar: no cambias de base de datos

Sigue siendo **PostgreSQL**, con el mismo `prisma/schema.prisma` y las mismas
migraciones. Lo único que cambia es *dónde vive* ese Postgres.

Hoy corre en un contenedor Docker en tu máquina, y ese contenedor no es
alcanzable desde internet: cuando Vercel intente conectarse a `localhost:5432`
va a buscarlo dentro de su propio servidor, no en tu computador. Por eso hace
falta un Postgres alojado.

Vercel no puede guardarlo él mismo — es serverless, no tiene disco persistente.
Esta guía usa **Supabase**, que es PostgreSQL estándar administrado.

### Las dos advertencias de Supabase Free (y cómo se manejan)

**1. El proyecto se pausa tras 7 días sin actividad** y hay que reactivarlo a
mano desde el dashboard (tarda 1-2 minutos). Esto normalmente sería un problema
para un demo que el cliente abre de vez en cuando.

En este proyecto **no lo es**, porque el cron diario de Vercel
(`0 7 * * *` → `/api/cron/sync-erp`) escribe un registro en la tabla
`ErpSyncLog` en cada ejecución — incluso con `ERP_PROVIDER=null`, porque
`syncCatalogFromERP()` guarda el log pase lo que pase. Eso genera actividad
diaria en la base y el contador de 7 días nunca se acerca al límite.

> **Depende del cron.** Si borras el bloque `crons` de `vercel.json`, o el cron
> falla varios días seguidos, vuelves a estar expuesto a la pausa. Vale la pena
> revisar el log de crons en Vercel de vez en cuando.

**2. La conexión directa (`db.<ref>.supabase.co`) es IPv6 en los proyectos
nuevos.** Las funciones de Vercel salen por IPv4, así que esa cadena no sirve.
La solución no es pagar el add-on de IPv4: es usar el **pooler (Supavisor)**
para las dos conexiones, cambiando solo el puerto. El paso 2 lo explica.

## Resumen de lo que cambia respecto a local

| Pieza | Local / Docker | Vercel + Supabase |
|---|---|---|
| Postgres | contenedor `db` | Supabase (2 URLs: pooler 6543 + pooler 5432) |
| Sincronización ERP | `node-cron` en el proceso Node | Vercel Cron → `GET /api/cron/sync-erp` |
| Imágenes | Cloudinary | Cloudinary (sin cambios) |
| Build | `Dockerfile` multi-stage | build nativo de Vercel |

Los cambios de código ya están hechos en el repo:

- `prisma/schema.prisma` — se agregó `directUrl` al datasource.
- `src/instrumentation-node.ts` — el `node-cron` ahora se salta cuando
  `process.env.VERCEL === "1"`. En local y en Docker sigue funcionando igual.
- `vercel.json` — programación del cron y `maxDuration` de las funciones lentas.
- `.env.example` — inventario completo de variables.

`Dockerfile` y `docker-compose.yml` quedan intactos para desarrollo local.

**De Supabase solo se usa la base de datos.** No se usa Auth (eso es
better-auth), ni Storage (eso es Cloudinary), ni el SDK `@supabase/*`. Todo el
acceso a datos pasa por Prisma sobre PostgreSQL estándar, así que mudar la base
a un servidor propio en la etapa 3 es un `pg_dump` + `pg_restore`, no una
reescritura.

---

## Paso 1 — Crear el proyecto en Supabase

Se hace **antes** que el de Vercel, porque necesitas las cadenas de conexión
para configurar el deploy.

1. Entrar a [supabase.com](https://supabase.com) → **Start your project** →
   sign in con GitHub. No pide tarjeta.
2. **New project**:
   - **Name:** `onestar` (o lo que prefieras)
   - **Database Password:** genérala y **guárdala en tu gestor de contraseñas
     ahora mismo**. Supabase no la vuelve a mostrar y sin ella toca resetearla.
     Si la generas tú, evita `@`, `:`, `/` y `?` — van dentro de una URL y
     tendrías que escaparlos.
   - **Region:** la base y las funciones de Vercel deben quedar cerca; si no,
     cada query paga el viaje de ida y vuelta y el sitio se siente lento sin
     razón aparente. Dos rutas equivalentes:
     - `East US (North Virginia)` y dejar Vercel en su `iad1` por defecto.
     - Cualquier otra región, y luego alinear Vercel en **Settings → Functions
       → Function Region**.

     > **El proyecto actual está en `us-west-2` (Oregon)**, así que Vercel debe
     > quedar en **Portland, us-west-2 (`pdx1`)**. Con el default `iad1` cada
     > query cruzaría el continente.
   - Plan **Free**.
3. Esperar ~2 minutos a que termine de provisionar.

> **El primer intento de conexión puede fallar.** Recién creado el proyecto —y
> también tras un rato sin uso— Prisma devuelve
> `P1001: Can't reach database server` mientras el pooler arranca en frío. Pasó
> en los dos puertos durante este despliegue y se resolvió reintentando el mismo
> comando. Antes de dudar de la cadena de conexión, reintenta.

> **No uses la integración de Supabase del Vercel Marketplace.** Inyecta las
> variables con nombres propios (`POSTGRES_URL`, `POSTGRES_PRISMA_URL`, …) que
> no son los que este proyecto lee, y termina siendo más confuso que copiar dos
> cadenas a mano.

## Paso 2 — Copiar las dos cadenas de conexión

En el dashboard de Supabase: botón **Connect** (arriba) → pestaña **ORMs** →
**Prisma**. Ahí aparecen las dos cadenas ya armadas.

| Variable | Cuál copiar | Para qué |
|---|---|---|
| `DATABASE_URL` | pooler, puerto **6543**, con `?pgbouncer=true` | runtime de la app |
| `DIRECT_URL` | pooler, puerto **5432** | `prisma migrate` y `db seed` |

Quedan así (reemplaza `[PASSWORD]` por la del paso 1, y **copia el host exacto
del dashboard** — el prefijo varía entre `aws-0-`, `aws-1-`, etc. según cuándo
se creó el proyecto):

```bash
DATABASE_URL="postgresql://postgres.<project-ref>:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<project-ref>:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres"
```

> **No agregues `sslmode=require`.** Con Supabase es contraproducente: probado
> en este despliegue, `?pgbouncer=true&sslmode=require` hace que Prisma falle
> con `Can't reach database server`, mientras que `?pgbouncer=true` a secas
> conecta sin problema. La conexión ya va cifrada.

**Por qué son dos y por qué el mismo host con puertos distintos:**

- El **puerto 6543 es el pooler en modo transaction**. Es obligatorio en
  serverless: cada invocación de una función abre su propia conexión y sin
  pooler agotas los slots de Postgres, con `too many connections` a tráfico
  mínimo. El `?pgbouncer=true` le dice a Prisma que desactive los *prepared
  statements*, que el modo transaction no soporta — omitirlo produce
  `prepared statement "s0" already exists`.
- El **puerto 5432 es el pooler en modo session**: mantiene una conexión
  dedicada durante toda la sesión, así que sí soporta los *advisory locks* y el
  DDL transaccional que necesita `prisma migrate`. De ahí `DIRECT_URL`.
- El modo session del pooler es la alternativa recomendada a la conexión directa
  `db.<ref>.supabase.co`, que en los proyectos nuevos solo responde por IPv6 y
  por tanto es inalcanzable desde Vercel.

## Paso 3 — Migrar y sembrar la base de datos

Esto se corre **desde tu máquina**, una sola vez. Vercel no ejecuta migraciones
por su cuenta.

Pon temporalmente las dos URLs de Supabase en tu `.env` local y ejecuta:

```bash
pnpm prisma migrate deploy    # aplica las migraciones existentes
pnpm db:seed                  # categorías, productos demo y usuario admin
```

`prisma migrate deploy` (**no** `migrate dev`) es el comando correcto acá:
aplica lo ya versionado sin intentar generar migraciones nuevas ni ofrecer
resetear la base. En este proyecto `migrate dev` está prohibido — ver
`docs/architecture.md`.

El seed crea categorías, productos demo, variantes, gift card, bloques de home,
navegación y secciones de landing. **No crea el usuario administrador** — ese es
un paso aparte, porque vive en la tabla `AdminUser`:

```bash
ADMIN_EMAIL=tu@correo.com ADMIN_PASSWORD='una-contraseña-real' \
  npx tsx scripts/create-admin.ts
```

Si omites `ADMIN_PASSWORD` el script genera una aleatoria y la imprime **una
sola vez**. Usa una contraseña real: este panel va a quedar público en internet.

Cuando termine, **devuelve tu `.env` a las URLs locales** para no seguir
trabajando contra la base que va a ver el cliente. Conviene guardar las cadenas
de Supabase en un `.env.supabase` aparte (el patrón `.env*` del `.gitignore` ya
lo excluye) y cargarlas solo cuando se necesiten:

```bash
set -a && . ./.env.supabase && set +a && pnpm prisma migrate deploy
```

Verifica en **Table Editor** de Supabase (o `pnpm db:studio`) que las tablas
tengan datos.

## Paso 4 — Crear el proyecto en Vercel

1. Entrar a [vercel.com](https://vercel.com) → **Sign up with GitHub**. No pide
   tarjeta.
2. **Add New → Project** → importar `Asygnuz-S-A-S/one-star`.
3. Vercel detecta Next.js solo. **No cambies** Build Command ni Output
   Directory.
4. **Settings → Git → Production Branch:** cambiar de `main` a **`develop`**.
   Es la rama donde vive el código real de este proyecto.
5. **Todavía no le des Deploy.** Va a fallar sin las variables de entorno.
   Si ya lo hiciste, no importa: seguimos y al final redespliegas.

## Paso 5 — Variables de entorno en Vercel

En **Settings → Environment Variables**, scope **Production** (y **Preview** si
quieres que las ramas también funcionen). La lista completa con descripciones
está en `.env.example`; estas son las que no pueden faltar:

```bash
DATABASE_URL          # pooler 6543 con pgbouncer=true (paso 2)
DIRECT_URL            # pooler 5432 (paso 2)
AUTH_SECRET           # openssl rand -base64 32
BETTER_AUTH_SECRET    # mismo valor que AUTH_SECRET
BETTER_AUTH_URL       # https://<tu-proyecto>.vercel.app   ← ver nota abajo
NEXT_PUBLIC_APP_URL   # https://<tu-proyecto>.vercel.app   ← ver nota abajo
CRON_SECRET           # openssl rand -hex 32
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
ERP_PROVIDER          # "null" para el demo, "loggro" si quieres sync real
RESEND_API_KEY
EMAIL_FROM
NEXT_PUBLIC_EPAYCO_PUBLIC_KEY
EPAYCO_PRIVATE_KEY
EPAYCO_CUSTOMER_ID
NEXT_PUBLIC_EPAYCO_TEST=true    # NO lo pongas en false en este entorno
```

> **El problema del huevo y la gallina con la URL.** `NEXT_PUBLIC_APP_URL` se
> incrusta en el bundle del cliente **en tiempo de build**, pero no conoces el
> dominio de Vercel hasta el primer deploy. Solución: pon un valor provisional,
> despliega, copia la URL real que te asignó Vercel, corrígela en las dos
> variables y **vuelve a desplegar** (Deployments → ⋯ → Redeploy).
>
> Si te la saltas, el login se rompe sin dar error visible: las cookies de
> sesión de better-auth se emiten para un dominio distinto al que sirve la app,
> y el navegador las descarta en silencio. El síntoma es "inicio sesión y me
> devuelve al login".

Tres notas más:

- **`CRON_SECRET` es obligatoria.** `/api/cron/sync-erp` es *fail-closed*: en
  producción sin ese secreto responde `503`. Vercel Cron manda automáticamente
  el header `Authorization: Bearer $CRON_SECRET`, así que solo hay que
  definirla. Y si el cron responde 503 todos los días, pierdes la actividad
  diaria que mantiene despierto a Supabase.
- **`NEXT_PUBLIC_EPAYCO_TEST` en `true`.** Con `false`, los checkouts de prueba
  del cliente serían cobros reales a su tarjeta.
- **Sentry es opcional.** Sin `SENTRY_DSN` queda deshabilitado solo
  (`enabled: Boolean(process.env.SENTRY_DSN)`). Si lo quieres, agrega también
  `SENTRY_ORG`, `SENTRY_PROJECT` y `SENTRY_AUTH_TOKEN` para los source maps.

## Paso 6 — Deploy

**Deploy** y esperar. El primer build tarda 3-6 minutos.

Si falla, busca en el log:

| Error | Causa | Arreglo |
|---|---|---|
| `Environment variable not found: DIRECT_URL` | falta la variable | agregarla (paso 2) y redesplegar |
| `prepared statement "s0" already exists` | falta `?pgbouncer=true` en `DATABASE_URL` | agregarlo (paso 2) |
| `P1001 Can't reach database server` | pooler arrancando en frío, o usaste `db.<ref>.supabase.co` (IPv6) | reintentar el comando; si insiste, cambiar a `pooler.supabase.com` (paso 2) |
| `P1001` con la cadena correcta | agregaste `sslmode=require` | quitarlo — rompe el pooler (paso 2) |
| `password authentication failed` | la contraseña trae `@`, `:`, `/` o `?` sin escapar | resetearla en Supabase por una alfanumérica |
| `Tenant or user not found` | el usuario del pooler va como `postgres.<project-ref>`, no `postgres` | copiar la cadena exacta del dashboard |
| `Environment variable not found: DIRECT_URL` | falta la variable en Vercel, o el `.env` no se cargó en local | en local lo resuelve el `process.loadEnvFile()` de `prisma.config.ts`; en Vercel, agregarla (paso 2) |
| `AUTH_SECRET is required` | falta el secret | `AUTH_SECRET` se lee en build, no solo en runtime |
| `P2022 The column ... does not exist` | drift entre `schema.prisma` y las migraciones | ver la nota de drift más abajo |
| `Table does not exist` | no corriste las migraciones | paso 3 |

### La nota de drift

Durante este despliegue, crear una base limpia reveló que las 9 migraciones del
repo **no reproducían el `schema.prisma`**: faltaban 9 tablas (`Brand`,
`ProductReview`, `InventoryLevel`, `NavigationItem`, `LandingSection`,
`StoreLocation`, `TopBanner`, `StoreLogo`, `HeaderConfig`), 11 columnas y un
enum. Las bases locales sí los tenían, aplicados en su momento sin generar la
migración correspondiente.

Se corrigió con la migración `20260729180000_sync_schema_drift`, escrita de
forma **idempotente** (`IF NOT EXISTS`) para que se pueda aplicar tanto en una
base nueva como en las bases de desarrollo que ya tenían esos objetos.

Para comprobar que no vuelve a aparecer drift:

```bash
pnpm prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script
```

Si responde `-- This is an empty migration.`, la base y el schema coinciden.
Cualquier otra salida es drift nuevo: hay que convertirlo en una migración
versionada, **nunca** arreglarlo con `db push` o `migrate dev`.

## Paso 7 — Webhook de ePayco

En el dashboard de ePayco, apuntar la **URL de confirmación** a:

```
https://<tu-proyecto>.vercel.app/api/epayco/webhook
```

Sin esto los pedidos quedan pendientes para siempre: ePayco procesa el pago pero
nadie le avisa a la tienda que se aprobó.

## Paso 8 — Verificar

```bash
# 1. La app responde y ve la BD
curl https://<tu-proyecto>.vercel.app/api/health

# 2. El cron rechaza a quien no trae el secreto (debe dar 401)
curl -i https://<tu-proyecto>.vercel.app/api/cron/sync-erp

# 3. Con el secreto correcto debe dar 200
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://<tu-proyecto>.vercel.app/api/cron/sync-erp
```

El punto 1 debe responder `{"status":"ok","db":"connected"}`. Si dice
`disconnected`, el problema está en las cadenas del paso 2.

Y a mano en el navegador:

- [ ] Home carga con banners e imágenes de Cloudinary
- [ ] Registro de un cliente nuevo → llega el correo de Resend
- [ ] Login y **recargar la página**: la sesión sobrevive (valida que las URLs quedaron bien)
- [ ] Agregar al carrito y llegar al checkout
- [ ] Login en `/admin` con el usuario creado por `scripts/create-admin.ts`
- [ ] Crear un producto en el admin y verlo en la tienda
- [ ] Filtro de colores en `/productos` y gestión en `/admin/colores`

## Paso 9 — Entregarle el enlace al cliente

Manda `https://<tu-proyecto>.vercel.app`. Dos avisos por escrito, para evitar
reportes de "bugs" que no lo son:

1. **Los pagos están en modo prueba.** Que no use tarjetas reales; ePayco tiene
   tarjetas de prueba para esto.
2. **La primera carga después de un rato puede tardar un poco.** Es la
   plataforma serverless despertando, no la tienda estando lenta.

---

## Límites del plan gratuito

**Vercel Hobby**

- Prohíbe el uso comercial en sus términos. Un ambiente de pruebas está bien;
  una tienda cobrando de verdad requiere **Pro ($20/mes)**.
- **Cron: 1 ejecución diaria como máximo.** Por eso `vercel.json` quedó en
  `0 7 * * *` (2 a.m. Colombia) en vez de los 30 minutos que usa `node-cron` en
  local. Además Vercel dispara los crons de Hobby dentro de una ventana de una
  hora, no al minuto exacto. Si la sync del ERP cada 30 minutos es requisito del
  negocio, esta ruta no da: toca VPS o Pro.
- 100 GB de ancho de banda al mes y funciones de máximo 60 segundos.

**Supabase Free**

- 500 MB de almacenamiento en la base y 5 GB de transferencia al mes.
- Máximo 2 proyectos activos en el plan gratuito por organización.
- **Pausa por inactividad a los 7 días.** Mitigada por el cron diario, como se
  explicó arriba. Si el proyecto igual se pausa, se reactiva desde el dashboard
  (**Restore project**) sin pérdida de datos.
- Sin backups automáticos en el plan Free. Si los datos de prueba importan:
  `pg_dump "$DIRECT_URL" --no-owner --no-privileges -Fc -f backup.dump`.

## Cuando toque migrar

Para vender de verdad, ordenadas por costo:

| Opción | Costo | Notas |
|---|---|---|
| VPS (Hetzner / DigitalOcean) | $5-6/mes | Usa el `Dockerfile` y `docker-compose.yml` que ya tienes. Recupera el cron de 30 min. Tú administras backups y TLS. |
| AWS Lightsail 2 GB | $12/mes (3 gratis) | Igual que el VPS, con snapshots automáticos integrados. |
| Vercel Pro + Supabase Pro | ~$45/mes | Cero administración, backups diarios, cron por minuto, sin pausas. |

Lo bueno: el código quedó compatible con las dos rutas. El `node-cron` se
reactiva solo cuando `VERCEL` no está definida, así que un despliegue en VPS
recupera la sync cada 30 minutos sin tocar nada, y en local `DIRECT_URL`
simplemente apunta al mismo Postgres que `DATABASE_URL`.

El procedimiento de migración de datos está en `docs/plan-despliegue.md`
(etapa 3).
