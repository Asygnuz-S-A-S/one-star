import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/site-logo.repository", () => ({
  getAllStoreLogos: vi.fn(),
  getPrimaryLogos: vi.fn(),
  addStoreLogo: vi.fn(),
  setPrimaryStoreLogo: vi.fn(),
  updateStoreLogoTheme: vi.fn(),
  deleteStoreLogo: vi.fn(),
}))

import * as service from "../site-logo.service"
import * as repository from "@/server/repositories/site-logo.repository"

const logoValido = {
  url: "/logos/logopositivo.svg",
  fileName: "logopositivo.svg",
  type: "desktop" as const,
  theme: "light" as const,
  isPrimary: true,
}

beforeEach(() => vi.clearAllMocks())

describe("lecturas de logos", () => {
  it("lista todos los logos", async () => {
    vi.mocked(repository.getAllStoreLogos).mockResolvedValue([{ id: "logo_1" }] as never)

    expect(await service.getAllStoreLogos()).toEqual([{ id: "logo_1" }])
  })

  it("devuelve los logos primarios que usa el header", async () => {
    vi.mocked(repository.getPrimaryLogos).mockResolvedValue({ desktop: null } as never)

    expect(await service.getPrimaryStoreLogos()).toEqual({ desktop: null })
  })
})

describe("addStoreLogo", () => {
  it("guarda un logo válido", async () => {
    vi.mocked(repository.addStoreLogo).mockResolvedValue({ id: "logo_1" } as never)

    await service.addStoreLogo(logoValido)

    expect(repository.addStoreLogo).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/logos/logopositivo.svg", type: "desktop" })
    )
  })

  it("rechaza una URL ejecutable en lugar de guardarla", async () => {
    await expect(
      service.addStoreLogo({ ...logoValido, url: "javascript:alert(1)" })
    ).rejects.toThrow()
    expect(repository.addStoreLogo).not.toHaveBeenCalled()
  })

  it("rechaza un tipo de logo desconocido", async () => {
    await expect(service.addStoreLogo({ ...logoValido, type: "banner" })).rejects.toThrow()
    expect(repository.addStoreLogo).not.toHaveBeenCalled()
  })
})

describe("setPrimaryStoreLogo", () => {
  it("marca el logo como primario para su tipo", async () => {
    vi.mocked(repository.setPrimaryStoreLogo).mockResolvedValue(undefined as never)

    await service.setPrimaryStoreLogo("logo_1", "mobile")

    expect(repository.setPrimaryStoreLogo).toHaveBeenCalledWith("logo_1", "mobile")
  })

  it("rechaza un tipo fuera del catálogo", async () => {
    await expect(service.setPrimaryStoreLogo("logo_1", "diagonal")).rejects.toThrow()
    expect(repository.setPrimaryStoreLogo).not.toHaveBeenCalled()
  })
})

describe("updateStoreLogoTheme", () => {
  it("acepta los temas soportados", async () => {
    vi.mocked(repository.updateStoreLogoTheme).mockResolvedValue({ id: "logo_1" } as never)

    await service.updateStoreLogoTheme("logo_1", "dark")

    expect(repository.updateStoreLogoTheme).toHaveBeenCalledWith("logo_1", "dark")
  })

  it("rechaza un tema desconocido", async () => {
    await expect(service.updateStoreLogoTheme("logo_1", "sepia")).rejects.toThrow()
    expect(repository.updateStoreLogoTheme).not.toHaveBeenCalled()
  })
})

describe("deleteStoreLogo", () => {
  it("delega la eliminación al repositorio", async () => {
    vi.mocked(repository.deleteStoreLogo).mockResolvedValue(undefined as never)

    await service.deleteStoreLogo("logo_1")

    expect(repository.deleteStoreLogo).toHaveBeenCalledWith("logo_1")
  })
})
