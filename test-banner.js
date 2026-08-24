async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.topBanner.findFirst();
    const data = {
      text: "test",
      btnText: "",
      btnUrl: "",
      messages: [{ text: "test", url: "" }],
      bgColor: "#000000",
      textColor: "#ffffff",
      isActive: true,
    };

    if (existing) {
      const res = await prisma.topBanner.update({ where: { id: existing.id }, data });
      console.log("Updated", res);
    } else {
      const res = await prisma.topBanner.create({ data });
      console.log("Created", res);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
