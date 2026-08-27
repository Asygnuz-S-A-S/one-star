#!/bin/sh
set -eu

PRISMA_CLI="node_modules/prisma/build/index.js"

if [ "$#" -eq 0 ]; then
  echo "El entrypoint requiere un comando para iniciar el contenedor." >&2
  exit 64
fi

# Los comandos operativos explícitos (por ejemplo `prisma --version`) no deben
# depender de PostgreSQL. La preparación aplica únicamente al CMD de la app.
if [ "$#" -ne 2 ] || [ "$1" != "node" ] || [ "$2" != "server.js" ]; then
  exec "$@"
fi

max_attempts="${DATABASE_STARTUP_MAX_ATTEMPTS:-12}"
retry_seconds="${DATABASE_STARTUP_RETRY_SECONDS:-5}"
probe_timeout_seconds="${DATABASE_STARTUP_PROBE_TIMEOUT_SECONDS:-5}"

case "$max_attempts" in
  ''|*[!0-9]*|0)
    echo "DATABASE_STARTUP_MAX_ATTEMPTS debe ser un entero mayor que cero." >&2
    exit 64
    ;;
esac
if [ "${#max_attempts}" -gt 3 ] || [ "$max_attempts" -gt 100 ]; then
  echo "DATABASE_STARTUP_MAX_ATTEMPTS no puede ser mayor que 100." >&2
  exit 64
fi

case "$retry_seconds" in
  ''|*[!0-9]*)
    echo "DATABASE_STARTUP_RETRY_SECONDS debe ser un entero igual o mayor que cero." >&2
    exit 64
    ;;
esac
if [ "${#retry_seconds}" -gt 3 ] || [ "$retry_seconds" -gt 300 ]; then
  echo "DATABASE_STARTUP_RETRY_SECONDS no puede ser mayor que 300." >&2
  exit 64
fi

case "$probe_timeout_seconds" in
  ''|*[!0-9]*|0)
    echo "DATABASE_STARTUP_PROBE_TIMEOUT_SECONDS debe ser un entero mayor que cero." >&2
    exit 64
    ;;
esac
if [ "${#probe_timeout_seconds}" -gt 2 ] || [ "$probe_timeout_seconds" -gt 60 ]; then
  echo "DATABASE_STARTUP_PROBE_TIMEOUT_SECONDS no puede ser mayor que 60." >&2
  exit 64
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL debe estar definida para iniciar la aplicación." >&2
  exit 64
fi
if [ -z "${DIRECT_URL:-}" ]; then
  echo "DIRECT_URL debe estar definida para aplicar migraciones." >&2
  exit 64
fi

attempt=1
while ! {
  printf 'SELECT 1;' | DATABASE_URL="$DIRECT_URL" DIRECT_URL="$DIRECT_URL" \
    timeout "$probe_timeout_seconds" node "$PRISMA_CLI" \
      db execute --stdin --schema prisma/schema.prisma
} >/dev/null 2>&1
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
