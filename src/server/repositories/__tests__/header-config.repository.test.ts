import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { findFirst, create, update } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: { headerConfig: { findFirst, create, update } },
}))

import { getHeaderConfig, updateHeaderConfig } from "../header-config.repository"

const entrada = {
  layout: "logo-center-nav-left",
  navAlignment: "center",
  showSearch: false,
  showCart: true,
  showUser: true,
  bgColor: "#000000",
  textColor: "#FFFFFF",
  hasBorderBottom: false,
  bgOpacity: 80,
  useBlur: true,
  margin: "0px",
  padding: "8px",
  borderRadius: "4px",
}

beforeEach(() => vi.clearAllMocks())

describe("getHeaderConfig", () => {
  it("devuelve la configuración existente sin crear otra", async () => {
    findFirst.mockResolvedValue({ id: "cfg_1" })

    expect(await getHeaderConfig()).toEqual({ id: "cfg_1" })
    expect(create).not.toHaveBeenCalled()
  })

  it("crea una configuración por defecto la primera vez", async () => {
    findFirst.mockResolvedValue(null)
    create.mockResolvedValue({ id: "cfg_nuevo" })

    expect(await getHeaderConfig()).toEqual({ id: "cfg_nuevo" })
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ layout: "logo-left-nav-center", showSearch: true }),
    })
  })
})

describe("updateHeaderConfig", () => {
  it("actualiza la fila existente", async () => {
    findFirst.mockResolvedValue({ id: "cfg_1" })
    update.mockResolvedValue({ id: "cfg_1" })

    await updateHeaderConfig(entrada)

    expect(update).toHaveBeenCalledWith({
      where: { id: "cfg_1" },
      data: expect.objectContaining({ bgOpacity: 80, useBlur: true }),
    })
    expect(create).not.toHaveBeenCalled()
  })

  it("crea la fila si todavía no existe", async () => {
    findFirst.mockResolvedValue(null)
    create.mockResolvedValue({ id: "cfg_nuevo" })

    await updateHeaderConfig(entrada)

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ layout: "logo-center-nav-left" }),
    })
    expect(update).not.toHaveBeenCalled()
  })

  it("solo escribe los campos conocidos, descartando extras del cliente", async () => {
    findFirst.mockResolvedValue(null)
    create.mockResolvedValue({ id: "cfg_nuevo" })

    await updateHeaderConfig({ ...entrada, id: "intento-de-sobrescribir" } as never)

    expect(create.mock.calls[0][0].data).not.toHaveProperty("id")
  })
})
