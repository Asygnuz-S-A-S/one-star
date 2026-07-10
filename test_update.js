const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tb = await prisma.topBanner.findFirst();
  console.log("Before:", tb.messages);
  const updated = await prisma.topBanner.update({
    where: { id: tb.id },
    data: { messages: [{text: "Prueba JS", url: "/js"}] }
  });
  console.log("After:", updated.messages);
}
main().catch(console.error).finally(() => prisma.$disconnect());
