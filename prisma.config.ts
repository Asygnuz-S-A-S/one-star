import { defineConfig } from "@prisma/config"

// Desde Prisma 6, la presencia de este archivo desactiva la carga automática del
// .env ("Prisma config detected, skipping environment variable loading"), así que
// `prisma migrate deploy` y `db:seed` fallaban con
// "Environment variable not found: DIRECT_URL". Lo cargamos explícitamente.
//
// process.loadEnvFile es nativo desde Node 20.12 — no hace falta dotenv. En
// Vercel no existe .env (las variables vienen del entorno): de ahí el guard y el
// try/catch, para no romper el build allá.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile()
  } catch {
    // Sin archivo .env: se asume que las variables ya están en el entorno.
  }
}

export default defineConfig({
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
})
