import "server-only"
import { prisma } from "@/server/db/prisma"

export async function getHeaderConfig() {
  const config = await prisma.headerConfig.findFirst()
  if (!config) {
    return prisma.headerConfig.create({
      data: {
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
    })
  }
  return config
}

export async function updateHeaderConfig(data: {
  layout: string
  navAlignment: string
  showSearch: boolean
  showCart: boolean
  showUser: boolean
  bgColor: string
  textColor: string
  hasBorderBottom: boolean
  bgOpacity: number
  useBlur: boolean
  margin: string
  padding: string
  borderRadius: string
}) {
  const cleanData = {
    layout: data.layout,
    navAlignment: data.navAlignment,
    showSearch: data.showSearch,
    showCart: data.showCart,
    showUser: data.showUser,
    bgColor: data.bgColor,
    textColor: data.textColor,
    hasBorderBottom: data.hasBorderBottom,
    bgOpacity: data.bgOpacity,
    useBlur: data.useBlur,
    margin: data.margin,
    padding: data.padding,
    borderRadius: data.borderRadius,
  }
  const existing = await prisma.headerConfig.findFirst()
  if (existing) {
    return prisma.headerConfig.update({
      where: { id: existing.id },
      data: cleanData
    })
  } else {
    return prisma.headerConfig.create({
      data: cleanData
    })
  }
}
