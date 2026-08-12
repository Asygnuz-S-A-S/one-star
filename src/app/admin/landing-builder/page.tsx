import React from "react"
import { getAllLandingSections } from "@/server/repositories/landing-section.repository"
import { getTopBanner } from "@/server/repositories/top-banner.repository"
import { getPrimaryLogos } from "@/server/repositories/site-logo.repository"
import { getAllNavigationItems } from "@/server/repositories/navigation.repository"
import { findManyCategories } from "@/server/repositories/category.repository"
import { getHeaderConfig } from "@/server/repositories/header-config.repository"
import { getAllBanners } from "@/server/services/banner.service"
import VisualBuilderContainer from "@/components/admin/VisualBuilderContainer"

export const metadata = {
  title: "Landing Builder | Admin One Star",
}

export default async function LandingBuilderPage() {
  const sections = await getAllLandingSections()
  
  // Fetch globals
  const topBanner = await getTopBanner()
  const logos = await getPrimaryLogos()
  const navigation = await getAllNavigationItems()
  const categories = await findManyCategories()
  const headerConfig = await getHeaderConfig()
  const banners = await getAllBanners()

  return <VisualBuilderContainer initialSections={sections} initialGlobals={{ topBanner, logos, navigation, headerConfig }} initialBanners={banners} categories={categories} />
}
