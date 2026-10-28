import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/server/auth/require-admin", () => ({ requireSuperAdmin: vi.fn() }))
vi.mock("@/server/services/media-asset.service", () => ({
  getMediaAssets: vi.fn(),
  deleteMediaAsset: vi.fn(),
  getMediaAssetDeletionInfo: vi.fn(),
  autoSyncExistingAssets: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { requireSuperAdmin } from "@/server/auth/require-admin"
import { getMediaAssetDeletionInfo } from "@/server/services/media-asset.service"
import { getMediaAssetDeletionInfoAction } from "./media-asset.actions"

const requireAdmin = vi.mocked(requireSuperAdmin)
const getDeletionInfo = vi.mocked(getMediaAssetDeletionInfo)

describe("getMediaAssetDeletionInfoAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdmin.mockResolvedValue({} as never)
  })

  it("permite al Super Admin ver referencias antes de retirar un índice", async () => {
    getDeletionInfo.mockResolvedValue({
      exists: true,
      referenceCount: 1,
      references: { banners: 1, brands: 0, landingSections: 0, logos: 0, productImages: 0 },
    })

    await expect(getMediaAssetDeletionInfoAction("media_1")).resolves.toMatchObject({
      success: true,
      data: { referenceCount: 1 },
    })
    expect(getDeletionInfo).toHaveBeenCalledWith("media_1")
  })

  it("no expone referencias a un usuario sin permiso", async () => {
    requireAdmin.mockRejectedValue(new Error("Esta acción requiere el rol Super Admin."))

    await expect(getMediaAssetDeletionInfoAction("media_1")).resolves.toEqual({
      success: false,
      error: "No se pudo verificar el uso del archivo.",
    })
    expect(getDeletionInfo).not.toHaveBeenCalled()
  })
})
