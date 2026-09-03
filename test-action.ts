import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
  try {
    const existing = await prisma.headerConfig.findFirst()
    const cleanData = {
      layout: "logo-center-nav-left",
      showSearch: false,
      showCart: true,
      showUser: false,
      bgColor: "#111111",
      textColor: "#EEEEEE"
    }
    
    if (existing) {
      console.log('Updating existing:', existing.id)
      const res = await prisma.headerConfig.update({
        where: { id: existing.id },
        data: cleanData
      })
      console.log('Updated:', res)
    }
  } catch(e) {
    console.error('Error:', e)
  }
}
test().finally(() => prisma.$disconnect())
