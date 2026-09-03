import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const compose = readFileSync(resolve(process.cwd(), "docker-compose.prod.yml"), "utf8")
const appService = compose.slice(compose.indexOf("\n  app:\n"), compose.indexOf("\nvolumes:\n"))

describe("docker-compose.prod.yml", () => {
  it("delega las migraciones al app sin conservar un servicio redundante", () => {
    expect(compose).not.toMatch(/^  migrate:$/m)
    expect(compose).toContain("condition: service_healthy")
  })

  it("conserva la recuperación del app después de reiniciar Docker", () => {
    expect(appService).toMatch(/^    restart: unless-stopped$/m)
    expect(appService).not.toMatch(/^    restart: "on-failure:/m)
  })
})
