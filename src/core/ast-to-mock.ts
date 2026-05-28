import * as ts from "typescript"
import { readFileSync, existsSync, readdirSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { faker } from "@faker-js/faker"

export class EnumRef {
  constructor(readonly ref: string) {}
}

const STRING_HINTS: Record<string, () => string> = {
  // person
  name:         () => faker.person.fullName(),
  firstName:    () => faker.person.firstName(),
  lastName:     () => faker.person.lastName(),
  username:     () => faker.internet.userName(),
  jobTitle:     () => faker.person.jobTitle(),
  // contact
  email:        () => faker.internet.email(),
  phone:        () => faker.phone.number(),
  // text
  description:  () => faker.lorem.sentence(),
  title:        () => faker.lorem.words(3),
  body:         () => faker.lorem.paragraph(),
  bio:          () => faker.lorem.sentence(),
  summary:      () => faker.lorem.sentence(),
  excerpt:      () => faker.lorem.sentence(),
  query:        () => faker.lorem.words(2),
  // location
  city:         () => faker.location.city(),
  address:      () => faker.location.streetAddress(),
  country:      () => faker.location.country(),
  timezone:     () => faker.location.timeZone(),
  // company / web
  company:      () => faker.company.name(),
  url:          () => faker.internet.url(),
  link:         () => faker.internet.url(),
  website:      () => faker.internet.url(),
  ip:           () => faker.internet.ip(),
  ipAddress:    () => faker.internet.ip(),
  // identifiers
  id:           () => faker.string.uuid(),
  slug:         () => faker.helpers.slugify(faker.lorem.words(2)).toLowerCase(),
  // auth
  password:     () => faker.internet.password(),
  secret:       () => faker.string.alphanumeric(32),
  token:        () => faker.string.alphanumeric(40),
  accessToken:  () => faker.string.alphanumeric(40),
  refreshToken: () => faker.string.alphanumeric(40),
  hash:         () => faker.string.alphanumeric(40),
  // misc
  color:        () => faker.color.human(),
  locale:       () => faker.helpers.arrayElement(["en-US", "ko-KR", "ja-JP", "fr-FR", "de-DE"]),
  language:     () => faker.helpers.arrayElement(["en", "ko", "ja", "fr", "de"]),
  mimeType:     () => faker.system.mimeType(),
  version:      () => faker.system.semver(),
  emoji:        () => faker.internet.emoji(),
}

const SUFFIX_HINTS: [string, () => string][] = [
  ["Id",   () => faker.string.uuid()],
  ["At",   () => faker.date.recent().toISOString()],
  ["Date", () => faker.date.recent().toISOString()],
  ["Url",  () => faker.internet.url()],
]

function getStringHint(fieldName: string): string {
  const exact = STRING_HINTS[fieldName]
  if (exact) return exact()
  for (const [suffix, fn] of SUFFIX_HINTS) {
    if (fieldName.length > suffix.length && fieldName.endsWith(suffix)) return fn()
  }
  return faker.lorem.word()
}

type TypeEntry =
  | { kind: "type";      node: ts.TypeNode }
  | { kind: "interface"; node: ts.InterfaceDeclaration }
  | { kind: "enum";      node: ts.EnumDeclaration }

export type TypeMap = Map<string, TypeEntry>

// TypeChecker + 순환 참조 방지용 컨텍스트
type Ctx = { checker: ts.TypeChecker; resolving: Set<ts.Declaration> }

// ─── TypeChecker 기반 타입 전개 ─────────────────────────────────────────────

function expandCheckerType(type: ts.Type, field: string, typeMap: TypeMap, ctx: Ctx, depth = 0): unknown {
  if (depth > 6) return {}

  if (type.flags & ts.TypeFlags.String)    return getStringHint(field)
  if (type.flags & ts.TypeFlags.Number)    return faker.number.int({ min: 0, max: 100 })
  if (type.flags & ts.TypeFlags.Boolean)   return faker.datatype.boolean()
  if (type.flags & ts.TypeFlags.Null)      return null
  if (type.flags & ts.TypeFlags.Undefined) return undefined
  if (type.flags & ts.TypeFlags.Void)      return undefined
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return {}
  if (type.flags & ts.TypeFlags.Never)     return null

  if (type.isStringLiteral()) return type.value
  if (type.isNumberLiteral()) return type.value
  if (type.flags & ts.TypeFlags.BooleanLiteral) return faker.datatype.boolean()

  if (type.isUnion()) {
    const concrete = type.types.filter(t => !(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)))
    const pool = concrete.length > 0 ? concrete : type.types
    return expandCheckerType(faker.helpers.arrayElement(pool), field, typeMap, ctx, depth)
  }

  if (type.isIntersection()) {
    const parts = type.types.map(t => {
      const v = expandCheckerType(t, field, typeMap, ctx, depth)
      return typeof v === "object" && v !== null ? v : {}
    })
    return Object.assign({}, ...parts)
  }

  // 배열 타입
  if (ctx.checker.isArrayType(type)) {
    const args = ctx.checker.getTypeArguments(type as ts.TypeReference)
    if (args.length) {
      const len = faker.number.int({ min: 1, max: 4 })
      return Array.from({ length: len }, () => expandCheckerType(args[0], "", typeMap, ctx, depth + 1))
    }
    return []
  }

  // 객체/인터페이스/클래스 - 프로퍼티 전개
  const props = type.getProperties()
  if (props.length) {
    const result: Record<string, unknown> = {}
    for (const prop of props) {
      const propType = ctx.checker.getTypeOfSymbol(prop)
      const optional = (prop.flags & ts.SymbolFlags.Optional) !== 0
      if (optional && Math.random() < 0.3) continue
      if (prop.flags & ts.SymbolFlags.Method || propType.getCallSignatures().length > 0) {
        result[prop.name] = () => {}
        continue
      }
      result[prop.name] = expandCheckerType(propType, prop.name, typeMap, ctx, depth + 1)
    }
    return result
  }

  return {}
}

// Symbol → Declaration → mock 변환 (node_modules 포함)
function resolveSymbolToMock(symbol: ts.Symbol, typeMap: TypeMap, ctx: Ctx): unknown {
  const resolved = symbol.flags & ts.SymbolFlags.Alias
    ? ctx.checker.getAliasedSymbol(symbol)
    : symbol

  const decls = resolved.getDeclarations()
  if (!decls?.length) return {}

  const decl = decls[0]
  if (ctx.resolving.has(decl)) return {}
  ctx.resolving.add(decl)

  try {
    if (ts.isInterfaceDeclaration(decl))  return interfaceToMock(decl, typeMap, ctx)
    if (ts.isTypeAliasDeclaration(decl))  return typeNodeToMock(decl.type, typeMap, undefined, ctx)
    if (ts.isEnumDeclaration(decl)) {
      const members    = [...decl.members]
      const picked     = faker.helpers.arrayElement(members)
      const memberName = ts.isIdentifier(picked.name) ? picked.name.text : String(members.indexOf(picked))
      return new EnumRef(`${decl.name?.text ?? "Enum"}.${memberName}`)
    }
    // 클래스 (ex: WebAssembly.Memory, Buffer 등)
    if (ts.isClassDeclaration(decl)) {
      const type = ctx.checker.getDeclaredTypeOfSymbol(resolved)
      return expandCheckerType(type, "", typeMap, ctx)
    }
    // 그 외 (mapped type, namespace 등) → checker로 타입 전개
    const type = ctx.checker.getDeclaredTypeOfSymbol(resolved)
    return expandCheckerType(type, "", typeMap, ctx)
  } finally {
    ctx.resolving.delete(decl)
  }
}

// ─── AST 기반 mock 변환 (로컬 타입, 빠른 경로) ──────────────────────────────

function interfaceToMock(node: ts.InterfaceDeclaration, typeMap: TypeMap, ctx?: Ctx): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (node.heritageClauses) {
    for (const clause of node.heritageClauses) {
      if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue
      for (const type of clause.types) {
        const name = ts.isIdentifier(type.expression) ? type.expression.text : ""
        const entry = name ? typeMap.get(name) : undefined
        if (entry?.kind === "interface") {
          Object.assign(result, interfaceToMock(entry.node, typeMap, ctx))
        } else if (ctx) {
          const sym = ctx.checker.getSymbolAtLocation(type.expression)
          if (sym) {
            const v = resolveSymbolToMock(sym, typeMap, ctx)
            if (typeof v === "object" && v !== null && !(v instanceof EnumRef)) Object.assign(result, v)
          }
        }
      }
    }
  }

  Object.assign(result, typeElementsToMock(node.members, typeMap, ctx))
  return result
}

function typeElementsToMock(
  members: ts.NodeArray<ts.TypeElement>,
  typeMap: TypeMap,
  ctx?: Ctx,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const member of members) {
    if (ts.isMethodSignature(member)) {
      const key = ts.isIdentifier(member.name) ? member.name.text
        : ts.isStringLiteral(member.name) ? member.name.text
        : ""
      if (key) result[key] = () => {}
      continue
    }
    if (!ts.isPropertySignature(member) || !member.type) continue
    const key = ts.isIdentifier(member.name)    ? member.name.text
      : ts.isStringLiteral(member.name) ? member.name.text
      : ""
    if (!key) continue
    if (member.questionToken && Math.random() < 0.3) continue
    result[key] = typeNodeToMock(member.type, typeMap, key, ctx)
  }
  return result
}

function extractLiteralKeys(node: ts.TypeNode): string[] {
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return [node.literal.text]
  if (ts.isUnionTypeNode(node)) return node.types.flatMap(extractLiteralKeys)
  return []
}

function typeNodeToMock(node: ts.TypeNode, typeMap: TypeMap, fieldName?: string, ctx?: Ctx): unknown {
  switch (node.kind) {
    case ts.SyntaxKind.StringKeyword:
      return fieldName ? getStringHint(fieldName) : faker.lorem.word()
    case ts.SyntaxKind.NumberKeyword:
      return faker.number.int({ min: 0, max: 100 })
    case ts.SyntaxKind.BooleanKeyword:
      return faker.datatype.boolean()
    case ts.SyntaxKind.NullKeyword:
      return null
    case ts.SyntaxKind.UndefinedKeyword:
    case ts.SyntaxKind.VoidKeyword:
      return undefined
    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.UnknownKeyword:
    case ts.SyntaxKind.ObjectKeyword:
      return {}
    case ts.SyntaxKind.NeverKeyword:
      return null

    case ts.SyntaxKind.LiteralType: {
      const lit = (node as ts.LiteralTypeNode).literal
      if (ts.isStringLiteral(lit))  return lit.text
      if (ts.isNumericLiteral(lit)) return Number(lit.text)
      if (lit.kind === ts.SyntaxKind.TrueKeyword)  return true
      if (lit.kind === ts.SyntaxKind.FalseKeyword) return false
      if (lit.kind === ts.SyntaxKind.NullKeyword)  return null
      return null
    }

    case ts.SyntaxKind.ArrayType: {
      const len = faker.number.int({ min: 1, max: 4 })
      return Array.from({ length: len }, () =>
        typeNodeToMock((node as ts.ArrayTypeNode).elementType, typeMap, undefined, ctx)
      )
    }

    case ts.SyntaxKind.UnionType: {
      const types = [...(node as ts.UnionTypeNode).types]
      const concrete = types.filter(
        t => t.kind !== ts.SyntaxKind.UndefinedKeyword && t.kind !== ts.SyntaxKind.NullKeyword
      )
      const pool = concrete.length > 0 && Math.random() > 0.2 ? concrete : types
      return typeNodeToMock(faker.helpers.arrayElement(pool), typeMap, fieldName, ctx)
    }

    case ts.SyntaxKind.IntersectionType: {
      const parts = (node as ts.IntersectionTypeNode).types.map(t => {
        const v = typeNodeToMock(t, typeMap, undefined, ctx)
        return typeof v === "object" && v !== null ? v : {}
      })
      return Object.assign({}, ...parts)
    }

    case ts.SyntaxKind.TypeLiteral:
      return typeElementsToMock((node as ts.TypeLiteralNode).members, typeMap, ctx)

    case ts.SyntaxKind.ParenthesizedType:
      return typeNodeToMock((node as ts.ParenthesizedTypeNode).type, typeMap, fieldName, ctx)

    case ts.SyntaxKind.TupleType:
      return (node as ts.TupleTypeNode).elements.map(e =>
        ts.isNamedTupleMember(e)
          ? typeNodeToMock(e.type, typeMap, undefined, ctx)
          : typeNodeToMock(e as ts.TypeNode, typeMap, undefined, ctx)
      )

    case ts.SyntaxKind.OptionalType:
      return Math.random() > 0.3
        ? typeNodeToMock((node as ts.OptionalTypeNode).type, typeMap, fieldName, ctx)
        : undefined

    case ts.SyntaxKind.FunctionType:
    case ts.SyntaxKind.ConstructorType:
      return () => undefined

    case ts.SyntaxKind.TypeReference: {
      const refNode = node as ts.TypeReferenceNode

      // 단순 Identifier인 경우 → 내장 유틸리티 & 로컬 typeMap 우선 처리
      if (ts.isIdentifier(refNode.typeName)) {
        const typeName = refNode.typeName.text

        if (typeName === "Date") return faker.date.recent().toISOString()
        if (typeName === "Array" && refNode.typeArguments?.length) {
          const len = faker.number.int({ min: 1, max: 4 })
          return Array.from({ length: len }, () =>
            typeNodeToMock(refNode.typeArguments![0], typeMap, undefined, ctx)
          )
        }
        if ((typeName === "Partial" || typeName === "Required" || typeName === "Readonly") && refNode.typeArguments?.length) {
          return typeNodeToMock(refNode.typeArguments[0], typeMap, fieldName, ctx)
        }
        if (typeName === "Pick" && refNode.typeArguments?.length === 2) {
          const base = typeNodeToMock(refNode.typeArguments[0], typeMap, undefined, ctx)
          if (typeof base !== "object" || base === null) return base
          const keys = extractLiteralKeys(refNode.typeArguments[1])
          return Object.fromEntries(keys.map(k => [k, (base as Record<string, unknown>)[k]]))
        }
        if (typeName === "Omit" && refNode.typeArguments?.length === 2) {
          const base = typeNodeToMock(refNode.typeArguments[0], typeMap, undefined, ctx)
          if (typeof base !== "object" || base === null) return base
          const keys = new Set(extractLiteralKeys(refNode.typeArguments[1]))
          return Object.fromEntries(
            Object.entries(base as Record<string, unknown>).filter(([k]) => !keys.has(k))
          )
        }
        if (typeName === "Promise" && refNode.typeArguments?.length) {
          return typeNodeToMock(refNode.typeArguments[0], typeMap, undefined, ctx)
        }
        if (typeName === "Record") return {}

        // TypeChecker로 먼저 해석: 여러 파일에 같은 이름의 타입이 있을 때
        // typeMap(전역 last-write-wins)보다 선언 컨텍스트 기반 해석이 정확함
        if (ctx) {
          const sym = ctx.checker.getSymbolAtLocation(refNode.typeName)
          if (sym) return resolveSymbolToMock(sym, typeMap, ctx)
        }

        const entry = typeMap.get(typeName)
        if (entry) {
          if (entry.kind === "enum") {
            const members    = [...entry.node.members]
            const picked     = faker.helpers.arrayElement(members)
            const memberName = ts.isIdentifier(picked.name) ? picked.name.text : String(members.indexOf(picked))
            return new EnumRef(`${typeName}.${memberName}`)
          }
          if (entry.kind === "interface") return interfaceToMock(entry.node, typeMap, ctx)
          return typeNodeToMock(entry.node, typeMap, fieldName, ctx)
        }
      }

      // QualifiedName (A.B) 등 Identifier가 아닌 경우 → TypeChecker로 처리
      if (ctx) {
        const sym = ctx.checker.getSymbolAtLocation(refNode.typeName)
        if (sym) return resolveSymbolToMock(sym, typeMap, ctx)

        // QualifiedName (A.B) 등 symbol을 못 가져온 경우 → 타입 직접 전개
        const type = ctx.checker.getTypeAtLocation(refNode)
        if (!(type.flags & ts.TypeFlags.Any)) {
          return expandCheckerType(type, fieldName ?? "", typeMap, ctx)
        }
      }

      return {}
    }

    default:
      return null
  }
}

// ─── 프로그램 생성 ────────────────────────────────────────────────────────────

function buildCompilerOptions(fromDir: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(fromDir, ts.sys.fileExists, "tsconfig.json")
  if (configPath) {
    const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile)
    if (!error) {
      const parsed = ts.parseJsonConfigFileContent(config, ts.sys, dirname(configPath))
      return {
        ...parsed.options,
        noEmit: true,
        skipLibCheck: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
      }
    }
  }
  return {
    target: ts.ScriptTarget.Latest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    moduleResolution: (ts.ModuleResolutionKind as any).NodeJs ?? 2,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false,
    skipLibCheck: true,
    noEmit: true,
  }
}

function resolveImportPath(importPath: string, fromFile: string): string | null {
  const base = resolve(dirname(fromFile), importPath)
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + ext
    if (existsSync(candidate)) return candidate
  }
  return null
}

// ─── 공개 API ────────────────────────────────────────────────────────────────

export function parseTypes(filePath: string): {
  typeMap: TypeMap
  exportedNames: string[]
  checker: ts.TypeChecker
} {
  const typeMap: TypeMap        = new Map()
  const exportedNames: string[] = []
  const visited                 = new Set<string>()
  const absMainPath             = resolve(filePath)

  const compilerOptions = buildCompilerOptions(dirname(absMainPath))
  const program         = ts.createProgram([absMainPath], compilerOptions)
  const checker         = program.getTypeChecker()

  function parseFile(currentPath: string): void {
    if (visited.has(currentPath)) return
    visited.add(currentPath)

    // program에 포함된 소스 파일 사용 (checker 연동을 위해 필수)
    const sourceFile = program.getSourceFile(currentPath)
      ?? ts.createSourceFile(currentPath, readFileSync(currentPath, "utf-8"), ts.ScriptTarget.Latest, true)

    const isMainFile = currentPath === absMainPath
    const isExported = (n: ts.Declaration) =>
      (ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Export) !== 0

    // 상대 경로 import를 따라 먼저 파싱
    for (const stmt of sourceFile.statements) {
      if (!ts.isImportDeclaration(stmt)) continue
      const spec = stmt.moduleSpecifier
      if (!ts.isStringLiteral(spec) || !spec.text.startsWith(".")) continue

      const resolved = resolveImportPath(spec.text, currentPath)
      if (!resolved) continue
      parseFile(resolved)

      // import { Foo as Bar } alias 처리
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

export function toMock(
  typeName: string,
  typeMap: TypeMap,
  checker?: ts.TypeChecker,
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const entry = typeMap.get(typeName)
  if (!entry) throw new Error(`Type "${typeName}" not found`)

  const ctx: Ctx | undefined = checker ? { checker, resolving: new Set() } : undefined

  let base: unknown
  if (entry.kind === "interface") base = interfaceToMock(entry.node, typeMap, ctx)
  else if (entry.kind === "enum") {
    const members    = [...entry.node.members]
    const picked     = faker.helpers.arrayElement(members)
    const memberName = ts.isIdentifier(picked.name) ? picked.name.text : String(members.indexOf(picked))
    base = new EnumRef(`${typeName}.${memberName}`)
  } else {
    base = typeNodeToMock(entry.node, typeMap, undefined, ctx)
  }

  if (base instanceof EnumRef || typeof base !== "object" || base === null) return base as unknown as Record<string, unknown>
  return overrides ? { ...(base as Record<string, unknown>), ...overrides } : base as Record<string, unknown>
}

export function toMockList(
  typeName: string,
  typeMap: TypeMap,
  count = 3,
  checker?: ts.TypeChecker,
): Record<string, unknown>[] {
  return Array.from({ length: count }, () => toMock(typeName, typeMap, checker))
}

// ─── 프로젝트 전체 스캔 ───────────────────────────────────────────────────────

const SKIP_SUFFIXES = [".test.ts", ".spec.ts", ".test.tsx", ".spec.tsx", ".stories.ts", ".stories.tsx"]

function scanProjectFiles(dir: string, excludeDirs: string[]): string[] {
  const files: string[] = []

  function walk(current: string): void {
    let entries
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (excludeDirs.includes(entry.name)) continue
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

export function parseTypesFromProject(
  dir: string,
  opts: { excludeDirs?: string[]; excludeFiles?: string[] } = {},
): {
  typeMap: TypeMap
  fileTypeMap: Map<string, string[]>
  checker: ts.TypeChecker
  compilerOptions: ts.CompilerOptions
} {
  const excludeDirs  = opts.excludeDirs ?? []
  const excludeSet   = new Set((opts.excludeFiles ?? []).map(f => resolve(f)))

  const files = scanProjectFiles(dir, excludeDirs).filter(f => !excludeSet.has(f))
  if (files.length === 0) throw new Error(`No TypeScript files found in "${dir}"`)

  const compilerOptions = buildCompilerOptions(dir)
  const program         = ts.createProgram(files, compilerOptions)
  const checker         = program.getTypeChecker()

  const typeMap: TypeMap             = new Map()
  const fileTypeMap                  = new Map<string, string[]>()
  const isExported = (n: ts.Declaration) =>
    (ts.getCombinedModifierFlags(n) & ts.ModifierFlags.Export) !== 0

  for (const filePath of files) {
    const sourceFile = program.getSourceFile(filePath)
    if (!sourceFile) continue

    const exportedNames: string[] = []

    function visit(node: ts.Node): void {
      if (ts.isInterfaceDeclaration(node)) {
        // first-write-wins: 여러 파일에 같은 이름이 있을 때 먼저 처리된 파일 기준 유지
        if (!typeMap.has(node.name.text)) typeMap.set(node.name.text, { kind: "interface", node })
        if (isExported(node)) exportedNames.push(node.name.text)
      } else if (ts.isTypeAliasDeclaration(node)) {
        if (!typeMap.has(node.name.text)) typeMap.set(node.name.text, { kind: "type", node: node.type })
        if (isExported(node)) exportedNames.push(node.name.text)
      } else if (ts.isEnumDeclaration(node)) {
        if (!typeMap.has(node.name.text)) typeMap.set(node.name.text, { kind: "enum", node })
        if (isExported(node)) exportedNames.push(node.name.text)
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)

    // import { Foo as Bar } alias 처리
    for (const stmt of sourceFile.statements) {
      if (!ts.isImportDeclaration(stmt)) continue
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

    if (exportedNames.length > 0) fileTypeMap.set(filePath, exportedNames)
  }

  return { typeMap, fileTypeMap, checker, compilerOptions }
}

export function findAssertionFailures(
  source: string,
  outFile: string,
  compilerOptions: ts.CompilerOptions,
): Set<string> {
  const outPath = resolve(outFile)
  const baseHost = ts.createCompilerHost(compilerOptions)
  const host: ts.CompilerHost = {
    ...baseHost,
    getSourceFile(name, lang) {
      if (resolve(name) === outPath) return ts.createSourceFile(name, source, lang, true)
      return baseHost.getSourceFile(name, lang)
    },
    fileExists(name) {
      return resolve(name) === outPath || baseHost.fileExists(name)
    },
  }

  const checkProg = ts.createProgram([outPath], compilerOptions, host)
  const sourceFile = checkProg.getSourceFile(outPath)
  if (!sourceFile) return new Set()

  const failed = new Set<string>()
  checkProg.getSemanticDiagnostics(sourceFile)
    .filter(d => d.code === 2352)
    .forEach(d => {
      const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n")
      const match = /to type '([^']+)'/.exec(msg)
      if (match) failed.add(match[1])
    })

  return failed
}
