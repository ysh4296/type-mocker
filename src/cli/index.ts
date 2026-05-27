#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs"
import { resolve, relative, dirname } from "node:path"
import { Command } from "commander"
import { parseTypes, toMock, toMockList, EnumRef, type TypeMap } from "../core/ast-to-mock"

const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`

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

function toTsVar(data: unknown, typeName: string, count: number): string {
  const varName = count === 1 ? `mock${typeName}` : `mock${typeName}s`
  const typeAnn = count === 1 ? typeName : `${typeName}[]`
  return `export const ${varName}: ${typeAnn} = ${serialize(data)}`
}

function buildFileHeader(typeNames: string[], typeMap: TypeMap, tsFile: string, outFile: string): string {
  const from = relative(dirname(resolve(outFile)), resolve(tsFile))
    .replace(/\\/g, "/")
    .replace(/\.ts$/, "")
  const importPath = from.startsWith(".") ? from : "./" + from
  const specifiers = typeNames
    .map(n => typeMap.get(n)?.kind === "enum" ? n : `type ${n}`)
    .join(", ")
  return `import { ${specifiers} } from "${importPath}"\n\n`
}

new Command()
  .name("ts-to-mock")
  .description("Generate typed mock variables from TypeScript interfaces")
  .version("0.1.0")
  .argument("<ts-file>", "TypeScript file containing interface definitions")
  .option("-n, --count <n>",     "number of mocks to generate", "1")
  .option("-o, --out <file>",    "save to file (default: stdout)")
  .option("-s, --schema <name>", "specific type to use (default: all types in file)")
  .addHelpText("after", `
Examples:
  ts-to-mock src/types/user.ts
  ts-to-mock src/types/user.ts -n 5
  ts-to-mock src/types/user.ts -o src/mocks/mockUser.ts
  ts-to-mock src/types/order.ts --schema Order -n 3 -o mocks/orders.ts
  `)
  .action((tsFile: string, opts: { count: string; out?: string; schema?: string }) => {
    let typeMap: ReturnType<typeof parseTypes>["typeMap"]
    let exportedNames: string[]
    let checker: ReturnType<typeof parseTypes>["checker"]
    try {
      ;({ typeMap, exportedNames, checker } = parseTypes(resolve(tsFile)))
    } catch (e) {
      die(`Cannot parse file: ${tsFile}\n${e}`)
    }

    if (exportedNames.length === 0) die(`No exported types found in "${tsFile}"`)

    const count = Math.max(1, parseInt(opts.count, 10) || 1)

    const targets = opts.schema
      ? (() => {
          const name = exportedNames.find(
            n => n === opts.schema || n.toLowerCase() === opts.schema!.toLowerCase()
          )
          if (!name) die(`Type "${opts.schema}" not found. Available: ${exportedNames.join(", ")}`)
          return [name!]
        })()
      : exportedNames

    const body = targets
      .map(n => toTsVar(count === 1 ? toMock(n, typeMap, checker) : toMockList(n, typeMap, count, checker), n, count))
      .join("\n\n")

    const out = opts.out
      ? buildFileHeader(targets, typeMap, tsFile, opts.out) + body
      : body

    if (opts.out) {
      mkdirSync(dirname(resolve(opts.out)), { recursive: true })
      writeFileSync(opts.out, out, "utf-8")
      console.error(green("✓") + ` Written to ${opts.out}`)
    } else {
      console.log(out)
    }
  })
  .parse()
