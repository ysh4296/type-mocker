import * as ts from "typescript"
import { readFileSync, existsSync, readdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import type { TypeMap, TypeEntry } from "./types"

/** Test/story file suffixes excluded from project scans. */
const SKIP_SUFFIXES = [
  ".test.ts", ".spec.ts",
  ".test.tsx", ".spec.tsx",
  ".stories.ts", ".stories.tsx",
]

const DEFAULT_SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "out", "build",
  ".next", ".turbo", ".cache", ".vite", "coverage",
])

// ─── Compiler setup ───────────────────────────────────────────────────────────

/**
 * Builds TypeScript compiler options for a given directory.
 * Reads `tsconfig.json` if present, otherwise returns safe defaults.
 * Always forces `noEmit` and disables noisy checks that would fail on
 * partially-typed projects.
 */
export function buildCompilerOptions(fromDir: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(fromDir, ts.sys.fileExists, "tsconfig.json")
  if (configPath) {
    const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile)
    if (!error) {
      const parsed = ts.parseJsonConfigFileContent(config, ts.sys, dirname(configPath))
      return {
        ...parsed.options,
        noEmit:              true,
        skipLibCheck:        true,
        noUnusedLocals:      false,
        noUnusedParameters:  false,
      }
    }
  }
  return {
    target:                       ts.ScriptTarget.Latest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    moduleResolution:             (ts.ModuleResolutionKind as any).NodeJs ?? 2,
    esModuleInterop:              true,
    allowSyntheticDefaultImports: true,
    strict:                       false,
    skipLibCheck:                 true,
    noEmit:                       true,
  }
}

/**
 * Resolves a relative import path from a TypeScript source file to an absolute
 * filesystem path. Tries common extensions if the path has none.
 */
export function resolveImportPath(importPath: string, fromFile: string): string | null {
  const base = resolve(dirname(fromFile), importPath)
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + ext
    if (existsSync(candidate)) return candidate
  }
  return null
}

// ─── File scanning ────────────────────────────────────────────────────────────

/**
 * Recursively collects all `.ts`/`.tsx` files under `dir`, skipping
 * any directory whose name is in `excludeDirs` and test/story file suffixes.
 */
export function scanProjectFiles(dir: string, excludeDirs: string[]): string[] {
  const files: string[] = []

  function walk(current: string): void {
    let entries
    try { entries = readdirSync(current, { withFileTypes: true }) }
    catch { return }

    for (const entry of entries) {
      if (DEFAULT_SKIP_DIRS.has(entry.name) || excludeDirs.includes(entry.name)) continue
      const fullPath = resolve(current, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile()) {
        const { name } = entry
        if (!name.endsWith(".ts") && !name.endsWith(".tsx")) continue
        if (SKIP_SUFFIXES.some(s => name.endsWith(s))) continue
        files.push(fullPath)
      }
    }
  }

  walk(resolve(dir))
  return files
}

// ─── Single-file parsing ──────────────────────────────────────────────────────

/**
 * Parses a single TypeScript file and all files it transitively imports.
 * Returns the typeMap, exported names, and a TypeChecker for cross-file lookups.
 *
 * Used by the CLI when generating mocks for one entry-point file at a time.
 */
export function parseTypes(filePath: string): {
  typeMap:       TypeMap
  exportedNames: string[]
  checker:       ts.TypeChecker
} {
  const typeMap:        TypeMap        = new Map()
  const exportedNames:  string[]       = []
  const visited                        = new Set<string>()
  const absMainPath                    = resolve(filePath)
  const compilerOptions                = buildCompilerOptions(dirname(absMainPath))
  const program                        = ts.createProgram([absMainPath], compilerOptions)
  const checker                        = program.getTypeChecker()

  function parseFile(currentPath: string): void {
    if (visited.has(currentPath)) return
    visited.add(currentPath)

    // Use the in-program source file so the TypeChecker can resolve symbols correctly
    const sourceFile =
      program.getSourceFile(currentPath) ??
      ts.createSourceFile(currentPath, readFileSync(currentPath, "utf-8"), ts.ScriptTarget.Latest, true)

    const isMainFile  = currentPath === absMainPath
    const isExported  = (n: ts.Declaration) =>
      (ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Export) !== 0

    // Follow relative imports before visiting the current file's declarations
    for (const stmt of sourceFile.statements) {
      if (!ts.isImportDeclaration(stmt)) continue
      const spec = stmt.moduleSpecifier
      if (!ts.isStringLiteral(spec) || !spec.text.startsWith(".")) continue

      const resolved = resolveImportPath(spec.text, currentPath)
      if (!resolved) continue
      parseFile(resolved)

      // Handle `import { Foo as Bar }` — register the alias in the typeMap
      const bindings = stmt.importClause?.namedBindings
      if (!bindings || !ts.isNamedImports(bindings)) continue
      for (const el of bindings.elements) {
        const localName    = el.name.text
        const importedName = el.propertyName?.text ?? localName
        if (localName !== importedName) {
          const entry = typeMap.get(importedName)
          if (entry) typeMap.set(localName, entry)
        }
      }
    }

    function visit(node: ts.Node) {
      if (ts.isInterfaceDeclaration(node)) {
        typeMap.set(node.name.text, { kind: "interface", node })
        if (isMainFile && isExported(node)) exportedNames.push(node.name.text)
      } else if (ts.isTypeAliasDeclaration(node)) {
        typeMap.set(node.name.text, { kind: "type", node: node.type })
        if (isMainFile && isExported(node)) exportedNames.push(node.name.text)
      } else if (ts.isEnumDeclaration(node)) {
        typeMap.set(node.name.text, { kind: "enum", node })
        if (isMainFile && isExported(node)) exportedNames.push(node.name.text)
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
  }

  parseFile(absMainPath)
  return { typeMap, exportedNames, checker }
}

// ─── Full project scan ────────────────────────────────────────────────────────

/**
 * Scans an entire project directory and builds a unified type registry.
 *
 * Uses a single TypeScript `Program` for all files so the TypeChecker can
 * resolve cross-file type references. When the same type name appears in
 * multiple files, the first file encountered wins (first-write-wins).
 *
 * Returns:
 * - `typeMap`      — flat registry of all exported types
 * - `fileTypeMap`  — maps each source file to its exported type names
 *                    (used when injecting enum imports in the plugin)
 * - `checker`      — TypeChecker for the full program
 * - `compilerOptions` — resolved options (forwarded to `findAssertionFailures`)
 */
export function parseTypesFromProject(
  dir: string,
  opts: { excludeDirs?: string[]; excludeFiles?: string[] } = {},
): {
  typeMap:          TypeMap
  fileTypeMap:      Map<string, string[]>
  checker:          ts.TypeChecker
  compilerOptions:  ts.CompilerOptions
} {
  const excludeDirs = opts.excludeDirs ?? []
  const excludeSet  = new Set((opts.excludeFiles ?? []).map(f => resolve(f)))

  const files = scanProjectFiles(dir, excludeDirs).filter(f => !excludeSet.has(f))
  if (files.length === 0) throw new Error(`No TypeScript files found in "${dir}"`)

  const compilerOptions = buildCompilerOptions(dir)
  const program         = ts.createProgram(files, compilerOptions)
  const checker         = program.getTypeChecker()

  const typeMap:    TypeMap               = new Map()
  const fileTypeMap                       = new Map<string, string[]>()
  const isExported  = (n: ts.Declaration) =>
    (ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Export) !== 0

  for (const filePath of files) {
    const sourceFile = program.getSourceFile(filePath)
    if (!sourceFile) continue

    const exportedNames: string[] = []
    // .d.ts files and script files (no import/export → TypeScript treats all
    // top-level declarations as globally available, same as ambient .d.ts)
    const isDts      = sourceFile.isDeclarationFile
    const isScript   = !sourceFile.statements.some(
      s => ts.isImportDeclaration(s) || ts.isExportDeclaration(s) || ts.isExportAssignment(s)
    )
    const includeAll = isDts || isScript

    function visit(node: ts.Node): void {
      if (ts.isInterfaceDeclaration(node)) {
        // First-write-wins: when two files export the same name, keep the first
        if (!typeMap.has(node.name.text))
          typeMap.set(node.name.text, { kind: "interface", node })
        if (includeAll || isExported(node)) exportedNames.push(node.name.text)
      } else if (ts.isTypeAliasDeclaration(node)) {
        if (!typeMap.has(node.name.text))
          typeMap.set(node.name.text, { kind: "type", node: node.type })
        if (includeAll || isExported(node)) exportedNames.push(node.name.text)
      } else if (ts.isEnumDeclaration(node)) {
        if (!typeMap.has(node.name.text))
          typeMap.set(node.name.text, { kind: "enum", node })
        if (includeAll || isExported(node)) exportedNames.push(node.name.text)
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)

    // Handle `import { Foo as Bar }` aliases within this file
    for (const stmt of sourceFile.statements) {
      if (!ts.isImportDeclaration(stmt)) continue
      const bindings = stmt.importClause?.namedBindings
      if (!bindings || !ts.isNamedImports(bindings)) continue
      for (const el of bindings.elements) {
        const localName    = el.name.text
        const importedName = el.propertyName?.text ?? localName
        if (localName !== importedName) {
          const entry = typeMap.get(importedName) as TypeEntry | undefined
          if (entry) typeMap.set(localName, entry)
        }
      }
    }

    if (exportedNames.length > 0) fileTypeMap.set(filePath, exportedNames)
  }

  return { typeMap, fileTypeMap, checker, compilerOptions }
}
