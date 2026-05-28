import { createUnplugin } from "unplugin"
import { resolve } from "node:path"
import { parseTypesFromProject, toMock } from "../core/ast-to-mock"
import { serialize } from "../core/serialize"
import { getStringRanges, isInsideString } from "./string-utils"
import { collectEnumNames, buildEnumImports } from "./enum-utils"

export interface TsMockOptions {
  /** Directory to scan for TypeScript source files. Defaults to the bundler project root. */
  dir?: string
  /** Additional directory names to exclude from the scan (e.g. `["__fixtures__"]`). */
  exclude?: string[]
}

const tsMockPlugin = createUnplugin((options: TsMockOptions = {}) => {
  let state: ReturnType<typeof parseTypesFromProject> | null = null
  let resolvedRoot = process.cwd()

  function scan() {
    const dir = resolve(options.dir ?? resolvedRoot)
    state = parseTypesFromProject(dir, { excludeDirs: options.exclude })
  }

  return {
    name: "ts-to-mock",
    // Must run before the bundler strips TypeScript generics, otherwise
    // `createMock<User>()` would already be `createMock()` when we see it.
    enforce: "pre" as const,

    buildStart() {
      scan()
    },

    transformInclude(id: string) {
      return /\.[jt]sx?$/.test(id)
    },

    transform(code: string, id: string) {
      if (!state) return null
      if (!code.includes("ts-to-mock")) return null
      if (!code.includes("createMock")) return null

      const { typeMap, fileTypeMap, checker } = state
      const enumsNeeded = new Set<string>()
      let transformed   = code

      // String ranges are recomputed before each replace pass because prior
      // substitutions shift all subsequent character offsets.

      // Replace createMock<TypeName>()
      let ranges = getStringRanges(transformed)
      transformed = transformed.replace(
        /createMock<(\w+)>\(\s*\)/g,
        (originalMatch: string, typeName: string, offset: number) => {
          if (isInsideString(offset, ranges)) return originalMatch
          try {
            const mock = toMock(typeName, typeMap, checker)
            collectEnumNames(mock, enumsNeeded)
            return serialize(mock, 0)
          } catch {
            return originalMatch
          }
        },
      )

      // Replace createMockList<TypeName>(count)
      ranges = getStringRanges(transformed)
      transformed = transformed.replace(
        /createMockList<(\w+)>\((\d+)\s*\)/g,
        (originalMatch: string, typeName: string, countStr: string, offset: number) => {
          if (isInsideString(offset, ranges)) return originalMatch
          try {
            const count = parseInt(countStr, 10)
            const mocks = Array.from({ length: count }, () => toMock(typeName, typeMap, checker))
            mocks.forEach(m => collectEnumNames(m, enumsNeeded))
            return serialize(mocks, 0)
          } catch {
            return originalMatch
          }
        },
      )

      if (transformed === code) return null

      const enumImportBlock = buildEnumImports(id, enumsNeeded, fileTypeMap, transformed)
      if (enumImportBlock) transformed = enumImportBlock + "\n" + transformed

      return { code: transformed, map: null }
    },

    watchChange(id: string) {
      if (id.endsWith(".ts") || id.endsWith(".tsx")) scan()
    },

    // Vite-specific extensions
    vite: {
      configResolved(config: { root: string }) {
        if (!options.dir) resolvedRoot = config.root
        scan()
      },
      handleHotUpdate({ file, server }: { file: string; server: { ws: { send: (msg: object) => void } } }) {
        if (!file.endsWith(".ts") && !file.endsWith(".tsx")) return
        scan()
        server.ws.send({ type: "full-reload" })
      },
    },
  }
})

export default tsMockPlugin
export const vite    = tsMockPlugin.vite
export const rollup  = tsMockPlugin.rollup
export const webpack = tsMockPlugin.webpack
export const esbuild = tsMockPlugin.esbuild
