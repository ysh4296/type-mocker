import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"
import { resolve } from "node:path"
import tsMock from "../src/vite/index.ts"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "ts-to-mock": resolve(__dirname, "../src/index.ts"),
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [(tsMock as any)({ dir: "./src" })],
})
