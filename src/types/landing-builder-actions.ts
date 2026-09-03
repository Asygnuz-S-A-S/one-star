import type {
  createBanner,
  deleteBanner,
  toggleBannerActive,
  updateBanner,
} from "@/server/actions/banner.actions"
import type { updateHeaderConfigAction } from "@/server/actions/header-config.actions"
import type {
  createGridBlock,
  deleteGridBlock,
  toggleGridBlockActive,
  updateGridBlock,
} from "@/server/actions/home-grid.actions"
import type {
  createLandingSectionAction,
  deleteLandingSectionAction,
  toggleLandingSectionActiveAction,
  updateLandingSectionConfigAction,
  updateLandingSectionPositionsAction,
} from "@/server/actions/landing.actions"
import type {
  createNavigationItemAction,
  deleteNavigationItemAction,
  toggleNavigationItemActiveAction,
  updateNavigationItemAction,
  updateNavigationPositionsAction,
} from "@/server/actions/navigation.actions"
import type {
  addStoreLogoAction,
  deleteStoreLogoAction,
  setPrimaryStoreLogoAction,
  updateStoreLogoThemeAction,
} from "@/server/actions/site-logo.actions"
import type { updateTopBannerAction } from "@/server/actions/top-banner.actions"

export interface LandingBuilderActions {
  createBanner: typeof createBanner
  deleteBanner: typeof deleteBanner
  toggleBannerActive: typeof toggleBannerActive
  updateBanner: typeof updateBanner
  updateHeaderConfigAction: typeof updateHeaderConfigAction
  createGridBlock: typeof createGridBlock
  deleteGridBlock: typeof deleteGridBlock
  toggleGridBlockActive: typeof toggleGridBlockActive
  updateGridBlock: typeof updateGridBlock
  createLandingSectionAction: typeof createLandingSectionAction
  deleteLandingSectionAction: typeof deleteLandingSectionAction
  toggleLandingSectionActiveAction: typeof toggleLandingSectionActiveAction
  updateLandingSectionConfigAction: typeof updateLandingSectionConfigAction
  updateLandingSectionPositionsAction: typeof updateLandingSectionPositionsAction
  createNavigationItemAction: typeof createNavigationItemAction
  deleteNavigationItemAction: typeof deleteNavigationItemAction
  toggleNavigationItemActiveAction: typeof toggleNavigationItemActiveAction
  updateNavigationItemAction: typeof updateNavigationItemAction
  updateNavigationPositionsAction: typeof updateNavigationPositionsAction
  addStoreLogoAction: typeof addStoreLogoAction
  deleteStoreLogoAction: typeof deleteStoreLogoAction
  setPrimaryStoreLogoAction: typeof setPrimaryStoreLogoAction
  updateStoreLogoThemeAction: typeof updateStoreLogoThemeAction
  updateTopBannerAction: typeof updateTopBannerAction
}
