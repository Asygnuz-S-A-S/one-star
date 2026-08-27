#!/bin/sh
set -eu

PRISMA_CLI="node_modules/prisma/build/index.js"

# Los comandos operativos explícitos (por ejemplo `prisma --version`) no deben
# depender de PostgreSQL. La preparación aplica únicamente al CMD de la app.
if [ "$#" -ne 2 ] || [ "$1" != "node" ] || [ "$2" != "server.js" ]; then
  exec "$@"
fi

max_attempts="${DATABASE_STARTUP_MAX_ATTEMPTS:-12}"
retry_seconds="${DATABASE_STARTUP_RETRY_SECONDS:-5}"

case "$max_attempts" in
  ''|*[!0-9]*|0)
    echo "DATABASE_STARTUP_MAX_ATTEMPTS debe ser un entero mayor que cero." >&2
    exit 64
    ;;
esac

case "$retry_seconds" in
  ''|*[!0-9]*)
    echo "DATABASE_STARTUP_RETRY_SECONDS debe ser un entero igual o mayor que cero." >&2
    exit 64
    ;;
esac

migration_url="${DIRECT_URL:-${DATABASE_URL:-}}"
if [ -z "$migration_url" ]; then
  echo "DIRECT_URL o DATABASE_URL debe estar definida para aplicar migraciones." >&2
  exit 64
fi

# Prisma exige DIRECT_URL al cargar el schema. En entornos sin una URL directa
# separada, reutilizar DATABASE_URL mantiene compatible el arranque tradicional.
export DIRECT_URL="$migration_url"

attempt=1
while ! printf 'SELECT 1;' | DATABASE_URL="$migration_url" \
  node "$PRISMA_CLI" db execute --stdin --schema prisma/schema.prisma >/dev/null 2>&1
do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "No fue posible conectar a PostgreSQL tras $max_attempts intentos." >&2
    exit 1
  fi

  echo "PostgreSQL aún no está disponible (intento $attempt/$max_attempts); reintentando en ${retry_seconds}s." >&2
  attempt=$((attempt + 1))
  sleep "$retry_seconds"
done

echo "PostgreSQL disponible; aplicando migraciones Prisma."
node "$PRISMA_CLI" migrate deploy

echo "Migraciones listas; iniciando la aplicación."
exec "$@"
