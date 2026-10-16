# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps
# Instala TODAS las dependencias (prod + dev) en una imagen limpia.
# Separar este stage evita reinstalar al cambiar solo el código fuente.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

# openssl  → requerido por el engine de Prisma en Alpine
# libc6-compat → compatibilidad de glibc en musl (Alpine)
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# pnpm-workspace.yaml lleva los `overrides` (pnpm 10 ya no lee
# `pnpm.overrides` del package.json). Sin este archivo la instalación con
# lockfile congelado falla con ERR_PNPM_LOCKFILE_CONFIG_MISMATCH.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalar la versión reproducible de pnpm y luego las dependencias con frozen lockfile
RUN npm install -g pnpm@10.34.5 && pnpm config set node-linker hoisted && pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — builder
# Genera el cliente Prisma para linux-musl y compila Next.js en modo standalone.
# Este stage contiene las herramientas de build y desarrollo.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copiar node_modules completos (incluye devDeps: prisma CLI, tsx)
COPY --from=deps /app/node_modules ./node_modules

# Copiar todo el código fuente y archivos de configuración
COPY . .

# Deshabilitar telemetría de Next.js durante el build
ENV NEXT_TELEMETRY_DISABLED=1

# Variables necesarias en build:
# - AUTH_SECRET: better-auth se inicializa al recolectar páginas; sin secret
#   lanza error en producción.
# - NEXT_PUBLIC_*: se "inyectan" en tiempo de build dentro del bundle del
#   cliente, así que deben existir aquí y no solo en el runtime del contenedor.
ARG AUTH_SECRET
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_EPAYCO_PUBLIC_KEY
ARG NEXT_PUBLIC_EPAYCO_TEST
ARG NEXT_PUBLIC_SENTRY_DSN
ENV AUTH_SECRET=${AUTH_SECRET}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_EPAYCO_PUBLIC_KEY=${NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}
ENV NEXT_PUBLIC_EPAYCO_TEST=${NEXT_PUBLIC_EPAYCO_TEST}
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}

# Generar el cliente Prisma con el engine para Alpine (linux-musl-openssl-3.0.x).
# Esta variable hace que el engine sea buscado en node_modules/.prisma en runtime.
RUN npx prisma generate

# Build de producción. Produce .next/standalone/ gracias a output: 'standalone'.
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — runner
# Imagen mínima de producción. Solo contiene lo necesario para ejecutar.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Usuario sin privilegios por seguridad (no correr como root)
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# ── Standalone output ────────────────────────────────────────────────────────
# Copia server.js + node_modules mínimos de Next.js al WORKDIR (/app)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# ── Assets estáticos ─────────────────────────────────────────────────────────
# standalone NO copia .next/static ni public automáticamente.
# server.js los sirve desde estas rutas cuando existen en el directorio de trabajo.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public

# ── Prisma engines ───────────────────────────────────────────────────────────
# El tracing de Next.js standalone NO incluye los engines de Prisma porque se
# cargan dinámicamente en runtime (no con import/require estático).
# Sin estas dos copias, PrismaClient lanza "Cannot find query engine" en runtime.
COPY --from=builder --chown=nextjs:nodejs \
  /app/node_modules/.prisma \
  ./node_modules/.prisma

COPY --from=builder --chown=nextjs:nodejs \
  /app/node_modules/@prisma/client \
  ./node_modules/@prisma/client

# ── Prisma CLI + migraciones ─────────────────────────────────────────────────
# Permite que el entrypoint ejecute `prisma migrate deploy` antes de iniciar
# server.js y conserva el CLI para comandos operativos explícitos.
# Se conserva el entrypoint directo (no `npx prisma`) para mantener estable el
# comando de despliegue sin depender de la resolución de binarios de npm.
COPY --from=builder --chown=nextjs:nodejs /app/prisma                    ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts          ./prisma.config.ts
# El CLI vive aislado del node_modules de Next para que npm no reemplace
# dependencias del bundle standalone. El symlink conserva el comando operativo
# `node node_modules/prisma/build/index.js ...` usado por despliegue y CI.
ENV NODE_PATH=/opt/prisma-cli/node_modules
COPY docker/prisma-cli/package.json docker/prisma-cli/package-lock.json /opt/prisma-cli/
RUN npm ci --prefix /opt/prisma-cli --cache /tmp/npm-cache --omit=dev && \
    ln -s /opt/prisma-cli/node_modules/prisma ./node_modules/prisma && \
    test "$(node -p "require('./node_modules/prisma/package.json').version")" = \
      "$(node -p "require('./node_modules/@prisma/client/package.json').version")" && \
    rm -rf /tmp/npm-cache

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod 755 ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

# server.js es el servidor mínimo generado por Next.js con output: 'standalone'
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
