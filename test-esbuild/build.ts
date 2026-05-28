import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"
import { esbuild as tsMock } from "../src/plugin/index.ts"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

await build({
  entryPoints: [resolve(__dirname, "src/main.ts")],
  bundle: true,
  platform: "browser",
  format: "iife",
  outfile: resolve(__dirname, "dist/main.js"),
  alias: {
    "ts-to-mock": resolve(__dirname, "../src/index.ts"),
  },
  plugins: [tsMock({ dir: resolve(__dirname, "src") })],
})

console.log("\n✓ esbuild 빌드 완료 → open index.html")
