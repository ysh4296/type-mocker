#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs"
import { resolve, relative, dirname } from "node:path"
import { Command } from "commander"
import { parseTypesFromProject, toMock, EnumRef, findAssertionFailures, type TypeMap } from "../core/ast-to-mock"

const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`

function die(msg: string): never {
  console.error(red("Error:") + " " + msg)
  process.exit(1)
  throw new Error(msg)
}

function serialize(value: unknown, depth = 0): string {
  const pad   = "  ".repeat(depth)
  const inner = "  ".repeat(depth + 1)

  if (value instanceof EnumRef)   return value.ref
  if (value === null)              return "null"
  if (value === undefined)         return "undefined"
  if (typeof value === "string")   return JSON.stringify(value)
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (typeof value === "function") return "() => {}"
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    const items = value.map(v => `${inner}${serialize(v, depth + 1)}`).join(",\n")
    return `[\n${items}\n${pad}]`
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${inner}${k}: ${serialize(v, depth + 1)}`)
    if (entries.length === 0) return "{}"
    return `{\n${entries.join(",\n")}\n${pad}}`
  }
  return "null"
}

function buildImports(
  entries: { typeName: string; filePath: string }[],
  typeMap: TypeMap,
  outFile: string,
): string {
  const byFile = new Map<string, string[]>()
  for (const { typeName, filePath } of entries) {
    const list = byFile.get(filePath) ?? []
    list.push(typeName)
    byFile.set(filePath, list)
  }

  return [...byFile.entries()]
    .map(([filePath, names]) => {
      const from = relative(dirname(resolve(outFile)), filePath)
        .replace(/\\/g, "/")
        .replace(/\.tsx?$/, "")
      const importPath = from.startsWith(".") ? from : "./" + from

      const specs = [
        ...names.filter(n => typeMap.get(n)?.kind === "enum"),
        ...names.filter(n => typeMap.get(n)?.kind !== "enum").map(n => `type ${n}`),
      ].join(", ")

      return `import { ${specs} } from "${importPath}"`
    })
    .join("\n")
}

const BASE_EXCLUDES = ["node_modules", "dist", "build", ".git", "coverage", ".next", ".nuxt"]

new Command()
  .name("ts-to-mock")
  .description("Scan a TypeScript project and generate a unified mock object for all exported types")
  .version("0.1.0")
  .argument("<dir>", "Root directory to scan for TypeScript files")
  .option("-o, --out <file>",        "Output file path (default: stdout)")
  .option("-e, --exclude <dirs...>", "Additional directory names to exclude from scanning")
  .addHelpText("after", `
Examples:
  ts-to-mock ./src
  ts-to-mock ./src -o ./src/mocks/index.ts
  ts-to-mock ./src -o ./mocks/index.ts -e __tests__ fixtures
  `)
  .action((dir: string, opts: { out?: string; exclude?: string[] }) => {
    const excludeDirs  = [...BASE_EXCLUDES, ...(opts.exclude ?? [])]
    const excludeFiles = opts.out ? [resolve(opts.out)] : []

    let typeMap: ReturnType<typeof parseTypesFromProject>["typeMap"]
    let fileTypeMap: ReturnType<typeof parseTypesFromProject>["fileTypeMap"]
    let checker: ReturnType<typeof parseTypesFromProject>["checker"]
    let compilerOptions: ReturnType<typeof parseTypesFromProject>["compilerOptions"]

    try {
      ;({ typeMap, fileTypeMap, checker, compilerOptions } = parseTypesFromProject(resolve(dir), { excludeDirs, excludeFiles }))
    } catch (e) {
      die(`Failed to parse project at "${dir}"\n${e}`)
    }

    type Entry = { typeName: string; filePath: string; mock: unknown }
    const mockEntries: Entry[] = []
    const seenTypes = new Set<string>()

    for (const [filePath, typeNames] of fileTypeMap) {
      for (const typeName of typeNames) {
        if (seenTypes.has(typeName)) continue
        seenTypes.add(typeName)
        try {
          const mock = toMock(typeName, typeMap, checker)
          mockEntries.push({ typeName, filePath, mock })
        } catch {
          console.error(dim(`  skipped ${typeName}: mock generation failed`))
        }
      }
    }

    if (mockEntries.length === 0) die("Failed to generate any mocks")

    const header = opts.out
      ? buildImports(mockEntries, typeMap, opts.out) + "\n\n"
      : ""

    const singleLines = mockEntries.map(({ typeName, mock }) =>
      `  ${typeName}Mock: ${serialize(mock, 1)} as ${typeName}`
    )

    const failedTypes = opts.out
      ? findAssertionFailures(
          header + `export const mocks = {\n${singleLines.join(",\n")},\n}`,
          opts.out,
          compilerOptions,
        )
      : new Set<string>()

    const bodyLines = mockEntries.map(({ typeName, mock }) => {
      const assertion = failedTypes.has(typeName) ? `as unknown as ${typeName}` : `as ${typeName}`
      return `  ${typeName}Mock: ${serialize(mock, 1)} ${assertion}`
    })
    const body = `export const mocks = {\n${bodyLines.join(",\n")},\n}`

    const out = header + body

    if (opts.out) {
      mkdirSync(dirname(resolve(opts.out)), { recursive: true })
      writeFileSync(opts.out, out, "utf-8")
      console.error(green("✓") + ` Written ${mockEntries.length} mocks to ${opts.out}`)
    } else {
      console.log(out)
    }
  })
  .parse()
