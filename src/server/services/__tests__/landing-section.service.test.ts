import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/landing-section.repository", () => ({
  HOME_LANDING_PAGE: "home",
  getAllLandingSections: vi.fn(),
  getActiveLandingSections: vi.fn(),
  getLandingPages: vi.fn(),
  updateLandingSectionPositions: vi.fn(),
  updateLandingSection: vi.fn(),
  createLandingSection: vi.fn(),
  deleteLandingSection: vi.fn(),
  getMaximumLandingSectionPosition: vi.fn(),
  publishLandingDrafts: vi.fn(),
  findLandingPageSettings: vi.fn(),
  upsertLandingPageSettings: vi.fn(),
  findPublicLandingPages: vi.fn(),
  createLandingPageWithSections: vi.fn(),
}))

vi.mock("@/server/services/product.service", () => ({
  getProductBySlug: vi.fn(),
  getRelatedProducts: vi.fn(),
}))

vi.mock("@/server/auth/require-admin", () => ({
  getAdminSession: vi.fn(),
}))

import * as service from "../landing-section.service"
import * as repository from "@/server/repositories/landing-section.repository"
import { getAdminSession } from "@/server/auth/require-admin"
import { getProductBySlug, getRelatedProducts } from "@/server/services/product.service"

beforeEach(() => vi.clearAllMocks())

describe("getAllLandingSections", () => {
  it("delega en el repositorio", async () => {
    vi.mocked(repository.getAllLandingSections).mockResolvedValue([] as never)

    expect(await service.getAllLandingSections()).toEqual([])
  })
})

describe("landings de campaña", () => {
  it("crea la sección en la landing indicada y numera dentro de ella", async () => {
    vi.mocked(repository.getMaximumLandingSectionPosition).mockResolvedValue(1)
    vi.mocked(repository.createLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.createLandingSection("HERO", "hoka-running")

    expect(repository.getMaximumLandingSectionPosition).toHaveBeenCalledWith("hoka-running")
    expect(repository.createLandingSection).toHaveBeenCalledWith(expect.objectContaining({ page: "hoka-running", position: 2 }))
  })

  it("rechaza slugs inseguros antes de consultar", async () => {
    await expect(service.getActiveLandingSections("../admin")).rejects.toThrow()
    await expect(service.createLandingSection("HERO", "Hoka Running")).rejects.toThrow()
    expect(repository.getActiveLandingSections).not.toHaveBeenCalled()
    expect(repository.createLandingSection).not.toHaveBeenCalled()
  })

  it("siempre lista la home aunque aún no tenga secciones", async () => {
    vi.mocked(repository.getLandingPages).mockResolvedValue(["hoka-running"])
    expect(await service.getLandingPages()).toEqual(["home", "hoka-running"])

    vi.mocked(repository.getLandingPages).mockResolvedValue(["hoka-running", "home"])
    expect(await service.getLandingPages()).toEqual(["home", "hoka-running"])
  })
})

describe("updateLandingSectionPositions", () => {
  it("valida las posiciones antes de escribir", async () => {
    vi.mocked(repository.updateLandingSectionPositions).mockResolvedValue(undefined as never)

    await service.updateLandingSectionPositions([{ id: "sec_1", position: 2 }])

    expect(repository.updateLandingSectionPositions).toHaveBeenCalledWith([
      { id: "sec_1", position: 2 },
    ])
  })

  it("rechaza una posición que no es número", async () => {
    await expect(
      service.updateLandingSectionPositions([{ id: "sec_1", position: "dos" } as never])
    ).rejects.toThrow()
    expect(repository.updateLandingSectionPositions).not.toHaveBeenCalled()
  })
})

describe("setLandingSectionActive", () => {
  it("activa y desactiva una sección", async () => {
    vi.mocked(repository.updateLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.setLandingSectionActive("sec_1", false)

    expect(repository.updateLandingSection).toHaveBeenCalledWith("sec_1", { isActive: false })
  })
})

describe("createLandingSection", () => {
  it("rechaza un tipo de sección desconocido", async () => {
    await expect(service.createLandingSection("CARRUSEL_RARO")).rejects.toThrow()
    expect(repository.createLandingSection).not.toHaveBeenCalled()
  })

  it("coloca la sección nueva al final y activa", async () => {
    vi.mocked(repository.getMaximumLandingSectionPosition).mockResolvedValue(3)
    vi.mocked(repository.createLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.createLandingSection("MEDIA_CAROUSEL")

    expect(repository.createLandingSection).toHaveBeenCalledWith(
      expect.objectContaining({ type: "MEDIA_CAROUSEL", position: 4, isActive: true })
    )
  })

  it("el carrusel de medios nace con contenido de ejemplo para no quedar vacío", async () => {
    vi.mocked(repository.getMaximumLandingSectionPosition).mockResolvedValue(0)
    vi.mocked(repository.createLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.createLandingSection("MEDIA_CAROUSEL")

    const config = vi.mocked(repository.createLandingSection).mock.calls[0][0]
      .config as Record<string, unknown>
    expect(config.title).toBe("PROMOS Y NOVEDADES")
    expect(Array.isArray(config.items)).toBe(true)
  })

  it.each([
    ["HERO", { kind: "campaignHero", version: 1 }],
    ["CATEGORY_GRID", { kind: "collectionTile", version: 1 }],
  ])("abre %s nuevo en el editor guiado, no en la configuración avanzada", async (type, expectedConfig) => {
    vi.mocked(repository.getMaximumLandingSectionPosition).mockResolvedValue(0)
    vi.mocked(repository.createLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.createLandingSection(type)

    expect(vi.mocked(repository.createLandingSection).mock.calls[0][0].config).toMatchObject(expectedConfig)
  })
})

describe("borrador de landing", () => {
  it("guarda la configuración como borrador, sin tocar lo publicado", async () => {
    vi.mocked(repository.updateLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.updateLandingSectionConfig("sec_1", { title: "Hola" })

    expect(repository.updateLandingSection).toHaveBeenCalledWith("sec_1", { draftConfig: { title: "Hola" } })
  })

  it("publica los borradores de una landing", async () => {
    vi.mocked(repository.publishLandingDrafts).mockResolvedValue(2)

    expect(await service.publishLandingPage("home")).toBe(2)
    expect(repository.publishLandingDrafts).toHaveBeenCalledWith("home")
  })

  it("la vista previa sin sesión de admin no muestra el borrador", async () => {
    vi.mocked(repository.getActiveLandingSections).mockResolvedValue([
      { id: "sec_1", config: { title: "Publicado" }, draftConfig: { title: "Borrador" } },
    ] as never)
    vi.mocked(getAdminSession).mockResolvedValue(null)

    const sections = await service.getLandingSectionsForRequest("home", true)

    expect(sections[0]?.config).toEqual({ title: "Publicado" })
  })

  it("la vista previa de un admin muestra el borrador", async () => {
    vi.mocked(repository.getActiveLandingSections).mockResolvedValue([
      { id: "sec_1", config: { title: "Publicado" }, draftConfig: { title: "Borrador" } },
    ] as never)
    vi.mocked(getAdminSession).mockResolvedValue({ user: { id: "admin" } } as never)

    const sections = await service.getLandingSectionsForRequest("home", true)

    expect(sections[0]?.config).toEqual({ title: "Borrador" })
  })
})

describe("deleteLandingSection", () => {
  it("delega la eliminación", async () => {
    vi.mocked(repository.deleteLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.deleteLandingSection("sec_1")

    expect(repository.deleteLandingSection).toHaveBeenCalledWith("sec_1")
  })
})

describe("landing activa u oculta y nombres reservados", () => {
  const section = { id: "s1", page: "black-friday", config: { a: 1 }, draftConfig: { a: 2 } }

  it("una landing oculta no se ve en la tienda", async () => {
    vi.mocked(repository.getActiveLandingSections).mockResolvedValue([section] as never)
    vi.mocked(repository.findLandingPageSettings).mockResolvedValue({ isActive: false } as never)

    expect(await service.getLandingSectionsForRequest("black-friday", false)).toEqual([])
  })

  it("el admin la sigue viendo en la vista previa, con el borrador", async () => {
    vi.mocked(repository.getActiveLandingSections).mockResolvedValue([section] as never)
    vi.mocked(repository.findLandingPageSettings).mockResolvedValue({ isActive: false } as never)
    vi.mocked(getAdminSession).mockResolvedValue({ user: { id: "a1" } } as never)

    const result = await service.getLandingSectionsForRequest("black-friday", true)
    expect(result).toHaveLength(1)
    expect(result[0].config).toEqual({ a: 2 })
  })

  it("sin ajustes guardados la landing está activa", async () => {
    vi.mocked(repository.getActiveLandingSections).mockResolvedValue([section] as never)
    vi.mocked(repository.findLandingPageSettings).mockResolvedValue(null)

    expect(await service.getLandingSectionsForRequest("black-friday", false)).toHaveLength(1)
  })

  it("no deja crear una landing nueva con el nombre de una ruta de la tienda", async () => {
    vi.mocked(repository.getAllLandingSections).mockResolvedValue([])

    await expect(service.createLandingSection("HERO", "checkout")).rejects.toThrow("es una ruta de la tienda")
    expect(repository.createLandingSection).not.toHaveBeenCalled()
  })

  it("el inicio no se puede desactivar", async () => {
    await expect(service.saveLandingPageSettings({ slug: "home", title: null, description: null, isActive: false })).rejects.toThrow()
    expect(repository.upsertLandingPageSettings).not.toHaveBeenCalled()
  })
})

describe("createLandingFromProduct", () => {
  afterEach(() => vi.unstubAllGlobals())

  const product = {
    slug: "clifton-9", name: "Hoka Clifton 9", brand: "HOKA", basePrice: 650000, isOnSale: false, salePrice: null,
    description: "Ligera", extendedDescription: null, metaTitle: null, metaDescription: "Para correr", highlights: [], faqs: [],
    images: [{ url: "https://res.cloudinary.com/x/c.jpg", alt: "Clifton" }], colorSiblings: [], categoryId: "cat-1",
  }

  it("crea la landing desactivada con portada, vitrina, detalles y relacionados", async () => {
    vi.mocked(repository.getAllLandingSections).mockResolvedValue([])
    vi.mocked(getProductBySlug).mockResolvedValue(product as never)
    vi.mocked(getRelatedProducts).mockResolvedValue([{ slug: "otro" }] as never)

    expect(await service.createLandingFromProduct("clifton", "clifton-9")).toBe("clifton")
    const [slug, settings, sections] = vi.mocked(repository.createLandingPageWithSections).mock.calls[0]
    expect(slug).toBe("clifton")
    expect(settings).toEqual({ title: "Hoka Clifton 9", description: "Para correr", isActive: false })
    expect(sections.map((section) => section.type)).toEqual(["HERO", "PRODUCT_CAROUSEL", "CUSTOM_HTML", "PRODUCT_CAROUSEL"])
  })

  it("usa la foto sin fondo si Cloudinary la está procesando y la original si no puede", async () => {
    const withPhoto = { ...product, images: [{ url: "https://res.cloudinary.com/x/image/upload/v1/c.jpg", alt: "Clifton" }] }
    const heroSrc = () => {
      const sections = vi.mocked(repository.createLandingPageWithSections).mock.calls.at(-1)![2]
      return ((sections[0].config as { slides: { foregroundMedia: { src: string } }[] }).slides[0].foregroundMedia.src)
    }
    vi.mocked(repository.getAllLandingSections).mockResolvedValue([])
    vi.mocked(getProductBySlug).mockResolvedValue(withPhoto as never)
    vi.mocked(getRelatedProducts).mockResolvedValue([])

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 423 }))
    await service.createLandingFromProduct("clifton", "clifton-9")
    expect(heroSrc()).toContain("/image/upload/e_background_removal/e_trim/")

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 400 }))
    await service.createLandingFromProduct("clifton", "clifton-9")
    expect(heroSrc()).toBe("https://res.cloudinary.com/x/image/upload/v1/c.jpg")
  })

  it("no consulta hosts que solo mencionan a Cloudinary en la ruta", async () => {
    const tramposa = "http://169.254.169.254/res.cloudinary.com/image/upload/v1/c.jpg"
    vi.mocked(repository.getAllLandingSections).mockResolvedValue([])
    vi.mocked(getProductBySlug).mockResolvedValue({ ...product, images: [{ url: tramposa, alt: "Clifton" }] } as never)
    vi.mocked(getRelatedProducts).mockResolvedValue([])
    const fetchMock = vi.fn().mockResolvedValue({ status: 200 })
    vi.stubGlobal("fetch", fetchMock)

    await service.createLandingFromProduct("clifton", "clifton-9")
    expect(fetchMock).not.toHaveBeenCalled()
    const sections = vi.mocked(repository.createLandingPageWithSections).mock.calls.at(-1)![2]
    expect((sections[0].config as { slides: { foregroundMedia: { src: string } }[] }).slides[0].foregroundMedia.src).toBe(tramposa)
  })

  it("no pisa una landing que ya existe ni usa rutas de la tienda", async () => {
    vi.mocked(repository.getAllLandingSections).mockResolvedValue([{ id: "s1" }] as never)
    await expect(service.createLandingFromProduct("clifton", "clifton-9")).rejects.toThrow("Ya existe una landing")
    await expect(service.createLandingFromProduct("checkout", "clifton-9")).rejects.toThrow("ruta de la tienda")
    expect(repository.createLandingPageWithSections).not.toHaveBeenCalled()
  })

  it("rechaza un producto que no está publicado", async () => {
    vi.mocked(repository.getAllLandingSections).mockResolvedValue([])
    vi.mocked(getProductBySlug).mockResolvedValue(null)
    await expect(service.createLandingFromProduct("clifton", "no-existe")).rejects.toThrow("no está publicado")
  })
})
