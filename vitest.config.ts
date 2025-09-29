import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.spec.ts", "tests/**/*.spec.tsx"],
    exclude: ["tests/e2e"],
    coverage: { reporter: ["text", "lcov"], provider: "v8" },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "."),
      "@": path.resolve(__dirname, "src"),
      "app": path.resolve(__dirname, "app"),
      "lib": path.resolve(__dirname, "lib"),
      "components": path.resolve(__dirname, "components"),
    },
  },
});
