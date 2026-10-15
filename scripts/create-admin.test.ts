import { spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const scriptPath = resolve(process.cwd(), "scripts/create-admin.ts")

describe("scripts/create-admin.ts", () => {
  it("falla si falta ADMIN_EMAIL", () => {
    const result = spawnSync("pnpm", ["exec", "tsx", scriptPath], {
      env: {
        ...process.env,
        ADMIN_EMAIL: "",
        ADMIN_ROLE: "SUPER_ADMIN",
      },
      encoding: "utf8",
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("ADMIN_EMAIL es requerida")
  })

  it("falla si falta ADMIN_ROLE (no asume valor por defecto)", () => {
    const result = spawnSync("pnpm", ["exec", "tsx", scriptPath], {
      env: {
        ...process.env,
        ADMIN_EMAIL: "admin@onestar.com.co",
        ADMIN_ROLE: "",
      },
      encoding: "utf8",
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("ADMIN_ROLE es requerida (sin valor por defecto)")
  })

  it("falla si ADMIN_ROLE tiene un valor no reconocido", () => {
    const result = spawnSync("pnpm", ["exec", "tsx", scriptPath], {
      env: {
        ...process.env,
        ADMIN_EMAIL: "admin@onestar.com.co",
        ADMIN_ROLE: "MODERATOR",
      },
      encoding: "utf8",
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('ADMIN_ROLE no válida: "MODERATOR"')
  })

  it("falla si ADMIN_ROLE tiene mayúsculas/minúsculas incorrectas", () => {
    const result = spawnSync("pnpm", ["exec", "tsx", scriptPath], {
      env: {
        ...process.env,
        ADMIN_EMAIL: "admin@onestar.com.co",
        ADMIN_ROLE: "super_admin",
      },
      encoding: "utf8",
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('ADMIN_ROLE no válida: "super_admin"')
  })
})
