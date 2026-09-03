import { getAllLandingSections } from "@/server/services/landing-section.service"
import { getTopBanner } from "@/server/services/top-banner.service"
import { getAllStoreLogos, getPrimaryStoreLogos } from "@/server/services/site-logo.service"
import { getAllNavigationItems } from "@/server/services/navigation.service"
import { getCategories } from "@/server/services/category.service"
import { getHeaderConfig } from "@/server/services/header-config.service"
import { getAllBanners } from "@/server/services/banner.service"
import { getAllGridBlocks } from "@/server/services/home-grid.service"
import VisualBuilderContainer from "@/components/admin/VisualBuilderContainer"
import {
  createBanner,
  deleteBanner,
  toggleBannerActive,
  updateBanner,
} from "@/server/actions/banner.actions"
import { updateHeaderConfigAction } from "@/server/actions/header-config.actions"
import {
  createGridBlock,
  deleteGridBlock,
  toggleGridBlockActive,
  updateGridBlock,
} from "@/server/actions/home-grid.actions"
import {
  createLandingSectionAction,
  deleteLandingSectionAction,
  toggleLandingSectionActiveAction,
  updateLandingSectionConfigAction,
  updateLandingSectionPositionsAction,
} from "@/server/actions/landing.actions"
import {
  createNavigationItemAction,
  deleteNavigationItemAction,
  toggleNavigationItemActiveAction,
  updateNavigationItemAction,
  updateNavigationPositionsAction,
} from "@/server/actions/navigation.actions"
import {
  addStoreLogoAction,
  deleteStoreLogoAction,
  setPrimaryStoreLogoAction,
  updateStoreLogoThemeAction,
} from "@/server/actions/site-logo.actions"
import { updateTopBannerAction } from "@/server/actions/top-banner.actions"
import type { LandingBuilderActions } from "@/types/landing-builder-actions"

export const metadata = {
  title: "Landing Builder | Admin One Star",
}

async function loadEditorData<T>(
  area: string,
  loader: Promise<T>,
  fallback: T,
  unavailableAreas: string[],
): Promise<T> {
  try {
    return await loader
  } catch (error) {
    console.error(`[landing-builder] No se pudo cargar ${area}:`, error)
    unavailableAreas.push(area)
    return fallback
  }
}

export default async function LandingBuilderPage() {
  const unavailableAreas: string[] = []
  const defaultHeaderConfig = {
    layout: "logo-left-nav-center",
    navAlignment: "left",
    showSearch: true,
    showCart: true,
    showUser: true,
    bgColor: "#FFFFFF",
    textColor: "#1C1C1C",
    hasBorderBottom: true,
    bgOpacity: 100,
    useBlur: false,
    margin: "0px",
    padding: "0px",
    borderRadius: "0px",
  }
  const [
    sections,
    topBanner,
    logoData,
    navigation,
    categories,
    headerConfig,
    banners,
    gridBlocks,
  ] = await Promise.all([
    loadEditorData("sections", getAllLandingSections(), [], unavailableAreas),
    loadEditorData("topBanner", getTopBanner(), null, unavailableAreas),
    loadEditorData(
      "logos",
      Promise.all([getPrimaryStoreLogos(), getAllStoreLogos()]),
      [{ desktop: null, mobile: null, large: null }, []] as const,
      unavailableAreas,
    ),
    loadEditorData("navigation", getAllNavigationItems(), [], unavailableAreas),
    loadEditorData("categories", getCategories(), [], unavailableAreas),
    loadEditorData("header", getHeaderConfig(), defaultHeaderConfig, unavailableAreas),
    loadEditorData("banners", getAllBanners(), [], unavailableAreas),
    loadEditorData("grid", getAllGridBlocks(), [], unavailableAreas),
  ])
  const [logos, allLogos] = logoData
  const actions: LandingBuilderActions = {
    createBanner,
    deleteBanner,
    toggleBannerActive,
    updateBanner,
    updateHeaderConfigAction,
    createGridBlock,
    deleteGridBlock,
    toggleGridBlockActive,
    updateGridBlock,
    createLandingSectionAction,
    deleteLandingSectionAction,
    toggleLandingSectionActiveAction,
    updateLandingSectionConfigAction,
    updateLandingSectionPositionsAction,
    createNavigationItemAction,
    deleteNavigationItemAction,
    toggleNavigationItemActiveAction,
    updateNavigationItemAction,
    updateNavigationPositionsAction,
    addStoreLogoAction,
    deleteStoreLogoAction,
    setPrimaryStoreLogoAction,
    updateStoreLogoThemeAction,
    updateTopBannerAction,
  }

  return (
    <VisualBuilderContainer
      actions={actions}
      initialSections={sections}
      initialGlobals={{ topBanner, logos, allLogos, navigation, headerConfig }}
      initialBanners={banners}
      initialGridBlocks={gridBlocks}
      categories={categories}
      unavailableAreas={unavailableAreas}
      dataVersion={new Date().toISOString()}
    />
  )
}
