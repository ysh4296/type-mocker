import { defineConfig } from "vite"
import TsMock from "unplugin-ts-mock/vite"

export default defineConfig({
  plugins: [TsMock({ dir: "./src" })],
})
