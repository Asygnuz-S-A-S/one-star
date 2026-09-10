# Despliegue con Docker — One Star

Procedimiento vigente. La tienda se despliega como un contenedor Docker junto a
su propio PostgreSQL. No se usa ninguna plataforma serverless.

> Contexto y decisiones: `docs/architecture.md` (sección Despliegue).
> El razonamiento histórico sobre portabilidad está en `docs/plan-despliegue.md`,
> marcado como superado.

---

## Piezas

| Archivo | Para qué sirve |
|---|---|
| `Dockerfile` | Tres etapas: `deps`, `builder` y `runner`. La imagen final arranca `node server.js` sobre la salida `standalone` de Next. |
| `docker-compose.prod.yml` | Producción: servicios `db` y `app`, red interna `backend` sin salida a internet y red `frontend` para el proxy. |
| `docker-compose.yml` | Desarrollo: añade `migrate` (aplica migraciones y seed al levantar) y `adminer`. |
| `docker-entrypoint.sh` | Antes de arrancar la app valida las variables, sondea PostgreSQL con reintentos acotados y ejecuta `prisma migrate deploy`. |

La rama de despliegue es `develop`.

## Requisitos

- Docker y Docker Compose en el servidor.
- Un proxy inverso delante (Nginx, Caddy, Traefik) que termine TLS y apunte al
  puerto 3000 del servicio `app`. El contenedor no expone el puerto al exterior:
  usa `expose`, no `ports`.
- Un archivo `.env` junto al compose con las variables de `.env.example`.

## Variables obligatorias

`docker-compose.prod.yml` falla al levantar si falta alguna, con el mensaje
`X is required`. El inventario completo y comentado está en `.env.example`; las
que no pueden faltar son:

```bash
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
DATABASE_URL, DIRECT_URL
AUTH_SECRET, BETTER_AUTH_SECRET, BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_EPAYCO_PUBLIC_KEY, NEXT_PUBLIC_EPAYCO_TEST
EPAYCO_PRIVATE_KEY, EPAYCO_CUSTOMER_ID
SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
RESEND_API_KEY, EMAIL_FROM
CRON_SECRET
```

Las variables `NEXT_PUBLIC_*` se incrustan en el bundle **durante el build**, así
que cambiarlas exige reconstruir la imagen, no solo reiniciar el contenedor.

`DATABASE_URL` y `DIRECT_URL` apuntan al mismo PostgreSQL del contenedor `db`.

## Desplegar

```bash
git pull origin develop
docker compose -f docker-compose.prod.yml up -d --build
```

El entrypoint aplica las migraciones pendientes antes de arrancar. Si PostgreSQL
todavía no responde, reintenta según `DATABASE_STARTUP_MAX_ATTEMPTS` (12 por
defecto) esperando `DATABASE_STARTUP_RETRY_SECONDS` entre intentos.

Verificar que quedó arriba:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

## Tareas programadas

Corren **dentro** de la aplicación, porque el proceso Node queda vivo entre
peticiones. Se programan en `src/instrumentation-node.ts`:

| Tarea | Cadencia |
|---|---|
| Sincronización con el ERP | despierta cada minuto; el vencimiento real lo decide `ErpSyncConfig` en PostgreSQL, configurable desde `/admin/integraciones` |
| Vencimiento de pedidos abandonados | diaria, 07:30 en la zona horaria del contenedor |

No hace falta configurar nada fuera del contenedor. Los endpoints
`GET /api/cron/sync-erp` y `GET /api/cron/expire-orders` siguen disponibles por
si algún día se prefiere un disparador externo (crontab, EventBridge): piden
`Authorization: Bearer $CRON_SECRET`. Si se usa uno, hay que apagar el cron
interno con `DISABLE_INTERNAL_CRON=1` para no ejecutar la tarea dos veces.

## Migraciones

Las aplica el entrypoint con `prisma migrate deploy`. **Nunca** se ejecuta
`prisma migrate dev` contra producción, y el seed general tampoco corre allí:
inserta el catálogo de demostración.

Un cambio destructivo de esquema debe pasar por el procedimiento de expansión y
contracción descrito en `docs/architecture.md`; el gate
`scripts/check-migration-safety.ts` lo verifica en CI.

## Copias de seguridad

Los datos viven en el volumen `onestar_pgdata`.

```bash
# Respaldo
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > respaldo-$(date +%F).sql

# Restauración
cat respaldo.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## Volver atrás

Las imágenes anteriores siguen en el servidor. Para regresar a un commit previo:

```bash
git checkout <sha-anterior>
docker compose -f docker-compose.prod.yml up -d --build
```

Una migración ya aplicada **no** se revierte sola: si el commit anterior no
contempla el cambio de esquema, hay que restaurar el respaldo.
