import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/header-config.repository", () => ({
  getHeaderConfig: vi.fn(),
  updateHeaderConfig: vi.fn(),
}))

import { getHeaderConfig, updateHeaderConfig } from "../header-config.service"
import * as repository from "@/server/repositories/header-config.repository"

const repoGet = vi.mocked(repository.getHeaderConfig)
const repoUpdate = vi.mocked(repository.updateHeaderConfig)

const configValida = {
  layout: "logo-left-nav-center",
  navAlignment: "center",
  showSearch: true,
  showCart: true,
  showUser: true,
  bgColor: "#FFFFFF",
  textColor: "#1C1C1C",
  hasBorderBottom: true,
  bgOpacity: 100,
  useBlur: false,
  margin: "0",
  padding: "0 1rem",
  borderRadius: "0",
}

beforeEach(() => vi.clearAllMocks())

describe("getHeaderConfig", () => {
  it("delega la lectura al repositorio", async () => {
    repoGet.mockResolvedValue({ showSearch: true } as never)

    expect(await getHeaderConfig()).toEqual({ showSearch: true })
  })
})

describe("updateHeaderConfig", () => {
  it("valida la entrada antes de escribir", async () => {
    repoUpdate.mockResolvedValue(configValida as never)

    await updateHeaderConfig(configValida)

    expect(repoUpdate).toHaveBeenCalledWith(expect.objectContaining({ showSearch: true }))
  })

  it("rechaza un tipo equivocado sin llegar al repositorio", async () => {
    await expect(
      updateHeaderConfig({ ...configValida, showSearch: "sí" })
    ).rejects.toThrow()
    expect(repoUpdate).not.toHaveBeenCalled()
  })

  it("rechaza una opacidad fuera del rango 0-100", async () => {
    await expect(updateHeaderConfig({ ...configValida, bgOpacity: 150 })).rejects.toThrow()
    expect(repoUpdate).not.toHaveBeenCalled()
  })

  it("rechaza un layout que no está en el catálogo de valores", async () => {
    await expect(
      updateHeaderConfig({ ...configValida, layout: "logo-derecha" })
    ).rejects.toThrow()
    expect(repoUpdate).not.toHaveBeenCalled()
  })
})
