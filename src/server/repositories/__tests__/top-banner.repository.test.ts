import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { findFirst, create, update } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: { topBanner: { findFirst, create, update } },
}))

import { getTopBanner, updateTopBanner } from "../top-banner.repository"

const banner = {
  text: "Envío gratis por compras superiores a $200.000",
  bgColor: "#1C1C1C",
  textColor: "#FFFFFF",
  isActive: true,
}

beforeEach(() => vi.clearAllMocks())

describe("getTopBanner", () => {
  it("devuelve null cuando no hay banner configurado", async () => {
    findFirst.mockResolvedValue(null)

    expect(await getTopBanner()).toBeNull()
  })
})

describe("updateTopBanner", () => {
  it("actualiza el banner existente en lugar de crear otro", async () => {
    findFirst.mockResolvedValue({ id: "tb_1" })
    update.mockResolvedValue({ id: "tb_1" })

    await updateTopBanner(banner)

    expect(update).toHaveBeenCalledWith({ where: { id: "tb_1" }, data: banner })
    expect(create).not.toHaveBeenCalled()
  })

  it("crea el banner la primera vez", async () => {
    findFirst.mockResolvedValue(null)
    create.mockResolvedValue({ id: "tb_nuevo" })

    await updateTopBanner(banner)

    expect(create).toHaveBeenCalledWith({ data: banner })
    expect(update).not.toHaveBeenCalled()
  })
})
