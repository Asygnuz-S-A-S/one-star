# One Star E-Commerce

Tienda en línea de One Star construida con Next.js 16, React 19, TypeScript,
Prisma y PostgreSQL. Incluye catálogo público, carrito, checkout, panel de
administración, Landing Builder e integración desacoplada con ERP.

## Requisitos previos

Para el flujo de desarrollo recomendado necesitas:

- Git.
- Node.js 20.19 o superior, o 22.13 o superior (Node.js 22 LTS recomendado).
- pnpm 10.34.5 (versión fijada en `package.json` y en el `Dockerfile`).
- Docker Desktop o Docker Engine con Docker Compose, para ejecutar PostgreSQL.

Comprueba las versiones instaladas:

```bash
node --version
pnpm --version
docker --version
docker compose version
```

Si no tienes pnpm, puedes habilitarlo con Corepack:

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
```

## Instalación local recomendada

Este flujo ejecuta PostgreSQL en Docker y la aplicación directamente con
Node.js. Es la opción más cómoda para desarrollar porque conserva la recarga
automática de Next.js.

### 1. Clonar el repositorio

```bash
git clone git@github.com:Asygnuz-S-A-S/one-star.git
cd one-star
git checkout develop
```

Si no tienes una llave SSH configurada en GitHub, clona por HTTPS:

```bash
git clone https://github.com/Asygnuz-S-A-S/one-star.git
cd one-star
git checkout develop
```

### 2. Instalar las dependencias

```bash
pnpm install --frozen-lockfile
```

### 3. Crear el archivo de entorno

Si aún no existe `.env`, créalo desde la plantilla:

```bash
test -e .env || cp .env.example .env
```

El comando conserva un `.env` existente. No lo reemplaces sin guardar antes
sus credenciales.

Genera un secreto para las sesiones:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Copia el resultado en `AUTH_SECRET` y `BETTER_AUTH_SECRET` dentro de `.env`.
Para una instalación local mínima, verifica estos valores:

```dotenv
DATABASE_URL="postgresql://onestar:onestar_pass@localhost:5432/onestar?schema=public"
DIRECT_URL="postgresql://onestar:onestar_pass@localhost:5432/onestar?schema=public"

AUTH_SECRET="pega-aqui-el-secreto-generado"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

ERP_PROVIDER="null"
ERP_CATALOG_WRITES_ENABLED="false"
```

No subas `.env` al repositorio. El archivo está ignorado por Git; solo
`.env.example`, que no contiene secretos, está versionado.

### 4. Iniciar PostgreSQL

```bash
docker compose up -d db
docker compose ps
```

Espera hasta que el servicio `db` aparezca como `healthy`.

### 5. Preparar la base de datos

Genera el cliente Prisma, aplica las migraciones versionadas y carga los datos
iniciales:

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm db:seed
```

El seed crea categorías, productos de muestra, variantes, una gift card,
navegación, grilla de inicio y secciones del Landing Builder. Aunque evita
duplicados principales, al repetirse actualiza campos y stock de los productos
demo; no lo ejecutes sobre un catálogo ya editado sin revisar antes el script.

### 6. Crear el usuario administrador

El seed no crea el administrador. Define sus datos y ejecuta el script:

```bash
ADMIN_EMAIL="admin@ejemplo.com" \
ADMIN_NAME="Admin One Star" \
ADMIN_PASSWORD="cambia-esta-contrasena" \
pnpm exec tsx --env-file=.env scripts/create-admin.ts
```

`ADMIN_EMAIL` es obligatorio. Si omites `ADMIN_PASSWORD`, el script genera una
contraseña aleatoria y la muestra una sola vez.

### 7. Iniciar la aplicación

```bash
pnpm dev
```

Abre:

- Tienda: [http://localhost:3000](http://localhost:3000)
- Login administrativo: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Landing Builder: [http://localhost:3000/admin/landing-builder](http://localhost:3000/admin/landing-builder)

Para detener únicamente PostgreSQL:

```bash
docker compose stop db
```

## Ejecutar todo con Docker Compose

Esta alternativa compila la aplicación en modo producción, aplica las
migraciones, ejecuta el seed y arranca PostgreSQL, Next.js y Adminer. El seed
puede actualizar los productos demo existentes, como se explicó anteriormente.

1. Crea `.env` como se explicó arriba y configura al menos `AUTH_SECRET`.
2. Ejecuta:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f app
```

Cuando veas que la aplicación está lista, sal de los logs con `Ctrl+C`; los
contenedores seguirán activos en segundo plano.

Servicios disponibles:

- Aplicación: [http://localhost:3000](http://localhost:3000)
- Adminer: [http://localhost:8080](http://localhost:8080)
- PostgreSQL: `localhost:5432`

En Adminer selecciona `PostgreSQL` y usa servidor `db`, usuario `onestar`,
contraseña `onestar_pass` y base `onestar`. Son credenciales exclusivas de
desarrollo: no publiques los puertos 5432 ni 8080 en una máquina accesible
desde internet.

Para crear el administrador dentro del entorno Docker:

```bash
docker compose run --rm \
  -e ADMIN_EMAIL="admin@ejemplo.com" \
  -e ADMIN_NAME="Admin One Star" \
  -e ADMIN_PASSWORD="cambia-esta-contrasena" \
  migrate npx tsx scripts/create-admin.ts
```

Detén los contenedores sin borrar la base de datos:

```bash
docker compose down
```

> `docker compose down -v` también elimina el volumen de PostgreSQL y todos sus
> datos. Úsalo únicamente si realmente quieres reiniciar la base desde cero.

## Despliegue con Docker Compose en producción

La fuente oficial de los despliegues es la rama `develop`. El archivo
`docker-compose.prod.yml` arranca PostgreSQL, aplica las migraciones versionadas
con `prisma migrate deploy` y solo después inicia la aplicación. No ejecuta el
seed, no incluye Adminer y no publica puertos del host.

1. En el servidor, crea un archivo `.env.production` fuera de Git a partir del
   inventario de `.env.example`. Define también `POSTGRES_USER`,
   `POSTGRES_PASSWORD` y `POSTGRES_DB`; `DATABASE_URL` y `DIRECT_URL` deben
   apuntar al servicio `db` usando esas mismas credenciales.
2. Valida la configuración y despliega:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs migrate
```

Si una migración falla, `app` no inicia. Corrige la conexión o la migración y
vuelve a ejecutar el mismo `up`; `prisma migrate deploy` es idempotente y omite
las migraciones ya aplicadas.

La aplicación solo declara el puerto interno `3000` en la red
`onestar_frontend`. El reverse proxy administrado por el servidor debe unirse a
esa red y dirigir el dominio al servicio `app:3000`. PostgreSQL permanece
aislado en `onestar_backend`. Esta separación evita exponer directamente la
aplicación, Adminer o la base de datos a Internet.

## Variables de entorno

El inventario completo, con ejemplos y comentarios, está en
[`.env.example`](./.env.example). Las variables se agrupan así:

| Grupo | Variables principales | Necesidad local |
|---|---|---|
| PostgreSQL | `DATABASE_URL`, `DIRECT_URL` | Obligatorias |
| Autenticación | `AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | Obligatorias |
| Administrador inicial | `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Solo al crear el admin |
| Almacenamiento | `STORAGE_PROVIDER`, `CLOUDINARY_*` | Necesarias para subir imágenes |
| ERP | `ERP_PROVIDER`, credenciales de Alegra o Loggro | Opcionales; usa `null` en local |
| Email | `RESEND_API_KEY`, `EMAIL_FROM` | Opcionales en desarrollo |
| Pagos | `NEXT_PUBLIC_EPAYCO_*`, `EPAYCO_*` | Necesarias para probar pagos reales |
| Observabilidad | `SENTRY_*`, `NEXT_PUBLIC_SENTRY_DSN` | Opcionales en desarrollo |

La tienda puede arrancar sin Cloudinary, Resend, ePayco, Sentry o un ERP real;
las funciones asociadas permanecerán deshabilitadas o usarán el modo local
degradado. Para evitar escrituras accidentales en un ERP durante desarrollo,
mantén:

```dotenv
ERP_PROVIDER="null"
ERP_CATALOG_WRITES_ENABLED="false"
```

Los archivos Compose propagan las variables públicas de ePayco y Sentry como
argumentos de build porque Next.js las incorpora al bundle del navegador durante
`next build`. Cambiar una variable `NEXT_PUBLIC_*` exige reconstruir la imagen;
reiniciar un contenedor ya construido no actualiza el bundle. En desarrollo con
`pnpm dev`, Next.js lee las variables directamente desde `.env`.

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Inicia Next.js en desarrollo |
| `pnpm build` | Genera el build de producción |
| `pnpm start` | Ejecuta el build de producción |
| `pnpm lint` | Ejecuta ESLint |
| `pnpm test` | Ejecuta las pruebas unitarias una vez |
| `pnpm test:watch` | Ejecuta Vitest en modo interactivo |
| `pnpm test:coverage` | Genera el reporte de cobertura |
| `pnpm test:e2e` | Ejecuta las pruebas E2E de Playwright |
| `pnpm db:seed` | Carga los datos iniciales |
| `pnpm db:seed:demo` | Carga el catálogo de demostración ampliado |
| `pnpm db:studio` | Abre Prisma Studio |

Para instalar o actualizar una copia existente usa siempre
`pnpm exec prisma migrate deploy`. El script `pnpm db:migrate` ejecuta
`prisma migrate dev`, puede proponer un reinicio de la base y se reserva para
crear migraciones nuevas con autorización explícita; no lo uses sobre datos
compartidos o de producción.

## Verificación antes de entregar cambios

```bash
pnpm lint
pnpm test
pnpm build
```

GitHub Actions ejecuta automáticamente `pnpm test` y `pnpm build` en cada
pull request cuya base sea `develop` y después de cada push a esa rama. El
workflow usa variables ficticias, no ejecuta migraciones ni despliegues y falla
si la instalación, la generación de Prisma Client, las pruebas o el build
fallan. En la protección de `develop`, configura `CI / test-and-build` como
check obligatorio antes de integrar cambios.

Para las pruebas E2E, instala una vez el navegador de Playwright:

```bash
# macOS y Windows
pnpm exec playwright install chromium

# Linux (instala también las bibliotecas del sistema)
pnpm exec playwright install --with-deps chromium

pnpm test:e2e
```

Las pruebas del panel administrativo requieren credenciales existentes. Para
ejecutarlas sin que Playwright las omita:

```bash
TEST_ADMIN_EMAIL="admin@ejemplo.com" \
TEST_ADMIN_PASSWORD="cambia-esta-contrasena" \
pnpm test:e2e
```

## Estructura y arquitectura

El flujo obligatorio del servidor es:

```text
Client Component → Server Action → Service → Repository → Prisma → PostgreSQL
```

Directorios principales:

```text
src/app/                  Rutas públicas, panel admin y Route Handlers
src/components/           Componentes de la tienda y del administrador
src/server/actions/       Mutaciones de servidor
src/server/services/      Lógica de negocio
src/server/repositories/  Acceso a datos
src/server/validators/    Validación con Zod
src/server/erp/           Contrato y adaptadores ERP
prisma/                   Esquema, migraciones y seeds
```

Lee [docs/architecture.md](./docs/architecture.md) antes de modificar código y
[REQUERIMIENTOS.md](./REQUERIMIENTOS.md) para conocer las reglas de negocio.

## Problemas frecuentes

### El puerto 5432 o 3000 ya está ocupado

Revisa qué proceso lo está usando:

```bash
lsof -nP -iTCP:5432 -sTCP:LISTEN
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Si solo necesitas otro puerto para Next.js:

```bash
pnpm exec next dev -p 3001
```

Actualiza también `BETTER_AUTH_URL` y `NEXT_PUBLIC_APP_URL` con el nuevo puerto.

Si el puerto 5432 está ocupado, detén la instancia local de PostgreSQL que no
necesites. Si debes conservarla, cambia temporalmente el mapeo del servicio
`db` en `docker-compose.yml` de `5432:5432` a `5433:5432`, y usa el puerto 5433
en `DATABASE_URL` y `DIRECT_URL`. No cambies el puerto interno `db:5432` usado
por los demás servicios de Compose.

### Prisma no encuentra `DATABASE_URL` o `DIRECT_URL`

Confirma que existe `.env`, que ambas variables tienen valor y que ejecutas los
comandos desde la raíz del repositorio.

### Prisma muestra `P1001: Can't reach database server`

Comprueba el estado y los logs de PostgreSQL:

```bash
docker compose ps db
docker compose logs db
```

### No puedo entrar al panel administrativo

El seed general no crea usuarios administrativos. Ejecuta nuevamente el paso
“Crear el usuario administrador” y entra por `/admin/login`.

### La carga de imágenes responde con error 503

Configura `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y
`CLOUDINARY_API_SECRET` en `.env`, y reinicia el servidor.

## Despliegue

La guía de despliegue en Vercel con PostgreSQL/Supabase está en
[docs/deploy-vercel.md](./docs/deploy-vercel.md). La rama configurada para el
despliegue actual es `develop`.

## Licencia y acceso

Este es un repositorio privado de One Star. No distribuyas código, credenciales
ni datos de clientes fuera de las personas autorizadas por el proyecto.
