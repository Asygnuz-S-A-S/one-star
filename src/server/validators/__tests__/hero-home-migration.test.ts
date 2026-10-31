import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { EditorialContentConfigSchema } from "@/server/validators/editorial-content.validator"
import { parseEditorialConfig, type CampaignHeroConfig } from "@/lib/editorial-config"

const sql = readFileSync(
  resolve(__dirname, "../../../../prisma/migrations/20261030000000_hero_home_hoka/migration.sql"),
  "utf8",
)

describe("migración del Hero HOKA de la home", () => {
  const blocks = [...sql.matchAll(/\$hero\$([\s\S]*?)\$hero\$/g)].map((m) => m[1])

  it("usa el mismo JSON en el UPDATE y en el INSERT", () => {
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toBe(blocks[1])
  })

  it("el JSON pasa el validador del admin y la tienda lo lee con 2 diapositivas", () => {
    const config = JSON.parse(blocks[0])
    expect(() => EditorialContentConfigSchema.parse(config)).not.toThrow()

    const parsed = parseEditorialConfig(config) as CampaignHeroConfig
    expect(parsed.kind).toBe("campaignHero")
    expect(parsed.slides?.map((s) => s.headline)).toEqual(["Domina tu terreno", "Tecton X 3"])
    expect(parsed.slides?.[1].foregroundMedia?.src).toMatch(/a3h8pykjlknxfveqe7rz\.png$/)
  })
})
