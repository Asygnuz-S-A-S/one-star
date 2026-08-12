import { defineConfig } from "@prisma/config"

export default defineConfig({
  // @ts-expect-error seed is not yet typed in Prisma 6
  seed: "tsx prisma/seed.ts",
})
