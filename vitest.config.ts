import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/server/services/**", "src/server/repositories/**"],
      thresholds: {
        lines: 80,
        functions: 80,
      },
    },
    // Mockea "server-only" para que no bloquee los tests
    server: {
      deps: {
        inline: ["server-only"],
      },
    },
  },
})
