import { randomBytes } from "crypto"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

/**
 * Crea o actualiza el usuario administrador.
 *
 * Credenciales vía variables de entorno (nunca hardcodeadas):
 *   ADMIN_EMAIL    — requerido
 *   ADMIN_PASSWORD — opcional; si falta se genera una aleatoria y se muestra una vez
 *   ADMIN_NAME     — opcional (default: "Admin One Star")
 */
async function main() {
  const email = process.env.ADMIN_EMAIL
  if (!email) {
    console.error("ADMIN_EMAIL es requerida. Uso: ADMIN_EMAIL=tu@correo.com npx tsx scripts/create-admin.ts")
    process.exitCode = 1
    return
  }

  const generatedPassword = !process.env.ADMIN_PASSWORD
  const password = process.env.ADMIN_PASSWORD ?? randomBytes(12).toString("base64url")
  const name = process.env.ADMIN_NAME ?? "Admin One Star"
  const passwordHash = bcrypt.hashSync(password, 10)

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, name, role: "SUPER_ADMIN" },
    create: { email, passwordHash, name, role: "SUPER_ADMIN" },
  })

  console.log("Admin creado/actualizado:")
  console.log(`Email: ${admin.email}`)
  if (generatedPassword) {
    console.log(`Password generada (guárdala ahora, no se volverá a mostrar): ${password}`)
  } else {
    console.log("Password: la definida en ADMIN_PASSWORD")
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
