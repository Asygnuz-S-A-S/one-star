import { test, expect } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

const COUPON_CODE = `CLUBE2E${Date.now().toString().slice(-6)}`

async function withPrisma<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  const prisma = new PrismaClient()
  try {
    return await fn(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

test.describe("One Star Club", () => {
  test.beforeAll(async () => {
    const day = 24 * 60 * 60 * 1000
    await withPrisma((prisma) =>
      prisma.coupon.create({
        data: {
          code: COUPON_CODE,
          discountType: "PERCENTAGE",
          discountValue: 15,
          clubOnly: true,
          validFrom: new Date(Date.now() - day),
          validUntil: new Date(Date.now() + 30 * day),
        },
      }),
    )
  })

  test.afterAll(async () => {
    await withPrisma((prisma) => prisma.coupon.deleteMany({ where: { code: COUPON_CODE } }))
  })

  test("un visitante ve la promoción pero no el código", async ({ page }) => {
    await page.goto("/club")

    await expect(page.getByRole("heading", { name: "One Star Club", level: 1 })).toBeVisible()
    await expect(page.getByRole("link", { name: /crear cuenta y unirme/i })).toBeVisible()
    await expect(page.getByText(/únete al club para ver el código/i).first()).toBeVisible()
    await expect(page.getByText(COUPON_CODE)).toHaveCount(0)
  })

  test("registrarse desde el club desbloquea los códigos y permite salir", async ({ page }) => {
    test.setTimeout(45_000)
    const email = `club-e2e-${Date.now()}-${test.info().workerIndex}@example.com`
    const password = "ClubE2e123!"

    try {
      await page.goto("/club")
      await page.getByRole("link", { name: /crear cuenta y unirme/i }).click()
      await expect(page).toHaveURL(/\/registro\?club=1/)
      await expect(page.getByRole("checkbox", { name: /unirme a one star club/i })).toBeChecked()

      await page.getByLabel("Nombre").fill("Cliente")
      await page.getByLabel("Apellido").fill("Club")
      await page.getByLabel("Cédula").fill(Date.now().toString().slice(-9))
      await page.getByLabel("Teléfono").fill("3001234567")
      await page.getByLabel("Fecha de nacimiento").fill("1990-01-01")
      await page.getByLabel(/correo electrónico/i).fill(email)
      await page.getByLabel("Contraseña", { exact: true }).fill(password)
      await page.getByLabel("Confirmar contraseña").fill(password)
      await page.getByLabel("Marca de preferencia").selectOption("Sin preferencia")
      await page.getByLabel("Hombre").check()
      await page.getByLabel(/acepto los términos/i).check()
      await page.getByRole("button", { name: /crear cuenta/i }).click()

      await expect(page).toHaveURL(/\/club$/, { timeout: 15_000 })
      await expect(page.getByText(/eres miembro desde/i)).toBeVisible()
      await expect(page.getByText(COUPON_CODE)).toBeVisible()

      const member = await withPrisma((prisma) => prisma.user.findFirst({ where: { email } }))
      expect(member?.clubMember).toBe(true)
      expect(member?.marketingConsentAt).toBeNull()

      // Tras la redirección del registro la página puede seguir hidratándose; salir es idempotente.
      await expect(async () => {
        await page.getByRole("button", { name: /salir del club/i }).click({ timeout: 2_000 })
        await expect(page.getByRole("button", { name: /unirme gratis/i })).toBeVisible({ timeout: 4_000 })
      }).toPass({ timeout: 20_000 })
      await expect(page.getByText(COUPON_CODE)).toHaveCount(0)

      await page.getByRole("checkbox", { name: /quiero recibir lanzamientos/i }).check()
      await page.getByRole("button", { name: /unirme gratis/i }).click()
      await expect(page.getByText(COUPON_CODE)).toBeVisible({ timeout: 10_000 })
      await expect(page.getByRole("checkbox", { name: /recibir lanzamientos/i })).toBeChecked()
    } finally {
      await withPrisma(async (prisma) => {
        await prisma.authUser.deleteMany({ where: { email } })
        await prisma.user.deleteMany({ where: { email } })
      })
    }
  })
})
