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

# Instalar pnpm y luego las dependencias con frozen lockfile
RUN npm install -g pnpm && pnpm config set node-linker hoisted && pnpm install --frozen-lockfile

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
# - NEXT_PUBLIC_APP_URL: las variables NEXT_PUBLIC_* se "inyectan" en tiempo de
#   build dentro del bundle del cliente, así que debe existir aquí.
ARG AUTH_SECRET
ARG NEXT_PUBLIC_APP_URL
ENV AUTH_SECRET=${AUTH_SECRET}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

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

USER nextjs

EXPOSE 3000

# server.js es el servidor mínimo generado por Next.js con output: 'standalone'
CMD ["node", "server.js"]
