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
    try {
      const dir = resolve(options.dir ?? resolvedRoot)
      state = parseTypesFromProject(dir, { excludeDirs: options.exclude })
    } catch (err) {
      console.error(`[unplugin-ts-mock] scan failed: ${err instanceof Error ? err.message : String(err)}`)
      state = null
    }
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
      if (id.includes("mockData")) console.log(`[unplugin-ts-mock] transformInclude: ${id}`)
      const path = id.split("?")[0]
      return /\.[jt]sx?$/.test(path)
    },

    transform(code: string, id: string) {
      if (id.includes("mockData")) console.log(`[unplugin-ts-mock] transform: ${id} | has<: ${code.includes("createMock<")}`)
      if (!code.includes("ts-to-mock")) return null
      if (!code.includes("createMock")) return null
      if (!state) scan()
      if (!state) return null
      if (!code.includes("createMock<")) {
        console.warn(`[unplugin-ts-mock] ${id}\n  ↳ createMock() found but generic was already stripped — ensure the plugin runs before SWC/TypeScript compilation`)
        return null
      }

      const { typeMap, fileTypeMap, checker } = state
      const enumsNeeded = new Set<string>()
      let transformed   = code

      // String ranges are recomputed before each replace pass because prior
      // substitutions shift all subsequent character offsets.

      const warn = (typeName: string, err: unknown) => {
        const reason = err instanceof Error ? err.message : String(err)
        console.warn(`[unplugin-ts-mock] ${id}\n  ↳ createMock<${typeName}>() — ${reason}`)
      }

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
          } catch (err) {
            warn(typeName, err)
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
          } catch (err) {
            warn(typeName, err)
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

    // webpack-specific: propagate transform rules to child compilers (Next.js SSR uses child compilers)
    webpack(compiler: any) {
      compiler.hooks.thisCompilation.tap("ts-to-mock", (compilation: any) => {
        compilation.hooks.childCompiler?.tap("ts-to-mock", (childCompiler: any) => {
          if (!state) scan()
          // Copy rules with function `use` (unplugin's pattern) from parent to child
          const parentRules: any[] = compiler.options?.module?.rules ?? []
          const loaderRules = parentRules.filter((r: any) => typeof r.use === "function")
          if (!loaderRules.length || !childCompiler.options?.module) return
          childCompiler.options.module.rules ??= []
          loaderRules.forEach((rule: any) => {
            if (!childCompiler.options.module.rules.includes(rule))
              childCompiler.options.module.rules.unshift(rule)
          })
          // Propagate $unpluginContext so the loader can find the plugin
          if (!childCompiler.$unpluginContext)
            childCompiler.$unpluginContext = compiler.$unpluginContext ?? {}
        })
      })
    },
  }
})

export default tsMockPlugin
export const vite    = tsMockPlugin.vite
export const rollup  = tsMockPlugin.rollup
export const webpack = tsMockPlugin.webpack
export const esbuild = tsMockPlugin.esbuild
