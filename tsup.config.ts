import { defineConfig } from "tsup"

const external = [
  "typescript",
  "@faker-js/faker",
  "unplugin",
  "vite",
  "rollup",
  "webpack",
  "esbuild",
]

export default defineConfig({
  entry: {
    "index":         "src/index.ts",
    "plugin/index":  "src/plugin/index.ts",
    "vite/index":    "src/vite/index.ts",
    "rollup/index":  "src/rollup/index.ts",
    "webpack/index": "src/webpack/index.ts",
    "esbuild/index": "src/esbuild/index.ts",
  },
  format:   ["esm", "cjs"],
  dts:      true,
  clean:    true,
  external,
  shims:    true,
  tsconfig: "tsconfig.build.json",
})
