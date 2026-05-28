import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { rollup } from "rollup"
import esbuild from "rollup-plugin-esbuild"
import nodeResolve from "@rollup/plugin-node-resolve"
import TsMock from "unplugin-ts-mock/rollup"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

const bundle = await rollup({
  input: resolve(__dirname, "src/main.ts"),
  plugins: [
    TsMock({ dir: resolve(__dirname, "src") }),
    esbuild({ target: "esnext" }),
    nodeResolve(),
  ],
})

await bundle.write({
  file: resolve(__dirname, "dist/main.js"),
  format: "iife",
  name: "App",
})

await bundle.close()
console.log("\n✓ Rollup 빌드 완료 → open index.html")
