async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const tb = await prisma.topBanner.findFirst();
    console.log("Before:", tb.messages);
    const updated = await prisma.topBanner.update({
      where: { id: tb.id },
      data: { messages: [{ text: "Prueba JS", url: "/js" }] },
    });
    console.log("After:", updated.messages);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
