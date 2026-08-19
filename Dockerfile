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

COPY package.json pnpm-lock.yaml ./

# Instalar la versión reproducible de pnpm y luego las dependencias con frozen lockfile
RUN npm install -g pnpm@10.34.5 && pnpm config set node-linker hoisted && pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — builder
# Genera el cliente Prisma para linux-musl y compila Next.js en modo standalone.
# Este stage también es reutilizado por el servicio "migrate" de docker-compose.
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
# Permite correr `prisma migrate deploy` contra esta misma imagen como paso
# previo al despliegue (no se ejecuta en el CMD, se invoca aparte, ej.
# `docker run --rm -e DATABASE_URL=... -e DIRECT_URL=... <imagen> node node_modules/prisma/build/index.js migrate deploy`).
# Se invoca el entrypoint directo (no `npx prisma`): el symlink .bin/prisma
# no sobrevive limpio entre stages con node-linker hoisted.
COPY --from=builder --chown=nextjs:nodejs /app/prisma                    ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts          ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma       ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma      ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@standard-schema ./node_modules/@standard-schema
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/effect       ./node_modules/effect
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/fast-check   ./node_modules/fast-check
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pure-rand    ./node_modules/pure-rand
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/deepmerge-ts ./node_modules/deepmerge-ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/empathic     ./node_modules/empathic
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/c12          ./node_modules/c12
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/chokidar     ./node_modules/chokidar
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/readdirp     ./node_modules/readdirp
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/confbox      ./node_modules/confbox
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/defu         ./node_modules/defu
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv       ./node_modules/dotenv
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/exsolve      ./node_modules/exsolve
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/giget        ./node_modules/giget
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/citty        ./node_modules/citty
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/consola      ./node_modules/consola
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/node-fetch-native ./node_modules/node-fetch-native
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/nypm         ./node_modules/nypm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tinyexec     ./node_modules/tinyexec
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/jiti         ./node_modules/jiti
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/ohash        ./node_modules/ohash
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pathe        ./node_modules/pathe
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/perfect-debounce ./node_modules/perfect-debounce
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pkg-types    ./node_modules/pkg-types
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/rc9          ./node_modules/rc9
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/destr        ./node_modules/destr

USER nextjs

EXPOSE 3000

# server.js es el servidor mínimo generado por Next.js con output: 'standalone'
CMD ["node", "server.js"]
