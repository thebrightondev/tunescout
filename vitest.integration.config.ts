import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    name: "integration",
    include: ["src/app/api/**/*.test.{ts,tsx}"],
    environment: "node",
    setupFiles: [],
    css: false,
    globals: false,
    coverage: {
      reporter: ["text", "html"],
      include: ["src/app/api/**/*.{ts,tsx}"],
    },
  },
});
