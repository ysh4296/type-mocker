import { defineConfig } from "tsup"

const external = ["typescript", "@faker-js/faker"]

export default defineConfig([
  {
    entry:    { "index": "src/index.ts" },
    format:   ["esm", "cjs"],
    dts:      true,
    clean:    true,
    external,
    shims:    true,
    tsconfig: "tsconfig.build.json",
  },
  {
    entry:    { "cli/index": "src/cli/index.ts" },
    format:   ["esm"],
    dts:      false,
    clean:    false,
    external: [...external, "commander"],
    shims:    true,
    tsconfig: "tsconfig.build.json",
    banner:   { js: "#!/usr/bin/env node" },
  },
])
