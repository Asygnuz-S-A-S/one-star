import { spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const scriptPath = resolve(process.cwd(), "scripts/admin-password-sql.cjs")

describe("scripts/admin-password-sql.cjs", () => {
  it("imprime la sentencia SQL de inserción y sincronización para un admin", () => {
    const result = spawnSync("node", [scriptPath, "admin@onestar.com"], {
      input: "claveSuperSegura123\n",
      encoding: "utf8",
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('INSERT INTO "AdminUser"')
    expect(result.stdout).toContain("admin@onestar.com")
    expect(result.stdout).toMatch(/\$2[ab]\$10\$/)
    expect(result.stdout).toContain('DELETE FROM "ba_sessions"')
    expect(result.stdout).toContain('UPDATE "ba_accounts"')
    expect(result.stdout).not.toContain("claveSuperSegura123")
  })

  it("rechaza contraseñas de menos de 10 caracteres", () => {
    const result = spawnSync("node", [scriptPath, "admin@onestar.com"], {
      input: "corta\n",
      encoding: "utf8",
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("al menos 10 caracteres")
  })
})
