const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tb = await prisma.topBanner.findFirst();
  console.log(tb);
}
main().catch(console.error).finally(() => prisma.$disconnect());
